using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using Microsoft.Win32.SafeHandles;

internal static partial class ScenarioForgeWindowsJobRunnerCore
{
    private const string V2_PROTOCOL_ID = "SF_WINDOWS_JOB_V2";
    private const uint V2_GENERIC_WRITE = 0x40000000;
    private const uint V2_PROCESS_QUERY_LIMITED_INFORMATION = 0x00001000;
    private const uint V2_WAIT_FAILED = 0xFFFFFFFF;
    private const uint V2_CLEANUP_EXIT_CODE = 3;
    private const int V2_CAUSE_NONE = 0;
    private const int V2_CAUSE_ROOT_EXIT = 1;
    private const int V2_CAUSE_PARENT_DEATH = 2;
    private const int V2_CAUSE_EXPLICIT_CANCEL = 3;
    private const int V2_CAUSE_CONTROL_LOSS = 4;
    private const int V2_CAUSE_TIMEOUT = 5;
    private const int V2_BOOTSTRAP_DECODED_LINE_MAX_BYTES = 64 * 1024;
    private const int V2_BOOTSTRAP_MAX_BYTES = 1024 * 1024;
    private const int V2_CONTROL_MESSAGE_MAX_BYTES = 16 * 1024;
    private const int V2_CANCEL_REASON_MAX_BYTES = 128;
    private const int JobObjectBasicAccountingInformation = 1;
    private static readonly IntPtr PROC_THREAD_ATTRIBUTE_JOB_LIST = new IntPtr(0x0002000D);
    private static int V2BootstrapBytesRead;

    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_BASIC_ACCOUNTING_INFORMATION
    {
        public long TotalUserTime;
        public long TotalKernelTime;
        public long ThisPeriodTotalUserTime;
        public long ThisPeriodTotalKernelTime;
        public uint TotalPageFaultCount;
        public uint TotalProcesses;
        public uint ActiveProcesses;
        public uint TotalTerminatedProcesses;
    }

    private sealed class RunnerSpecV2
    {
        public string RunId;
        public uint ParentPid;
        public string ControlPipeName;
        public string ControlToken;
        public RunnerSpec Command;
    }

    private sealed class ControlStateV2
    {
        public RunnerSpecV2 Spec;
        public uint HelperPid;
        public string ParentCreationTimeFileTime;
        public StreamReader Reader;
        public StreamWriter Writer;
        public IntPtr ReadPipeHandle;
        public IntPtr ParentHandle;
        public IntPtr PrimaryCauseEvent;
        public ManualResetEvent StartAckCompleted = new ManualResetEvent(false);
        public object WriteLock = new object();
        public int NextNodeSequence = 2;
        public int NextHelperSequence = 3;
        public bool StartAckVerified;
        public int FirstCause;
        public string CancelRequestId;
        public List<string> SecondaryCauses = new List<string>();
        public bool TerminalCommitted;
        public string Error;
    }

    private sealed class JsonCursorV2
    {
        public string Source;
        public int Index;
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GetProcessTimes(
        IntPtr hProcess,
        out long lpCreationTime,
        out long lpExitTime,
        out long lpKernelTime,
        out long lpUserTime);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern uint GetProcessId(IntPtr processHandle);

    [DllImport("kernel32.dll")]
    private static extern uint GetCurrentProcessId();

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr CreateEventW(
        IntPtr lpEventAttributes,
        [MarshalAs(UnmanagedType.Bool)] bool bManualReset,
        [MarshalAs(UnmanagedType.Bool)] bool bInitialState,
        string lpName);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetEvent(IntPtr hEvent);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern uint WaitForMultipleObjects(
        uint nCount,
        IntPtr[] lpHandles,
        [MarshalAs(UnmanagedType.Bool)] bool bWaitAll,
        uint dwMilliseconds);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool PeekNamedPipe(
        IntPtr hNamedPipe,
        IntPtr lpBuffer,
        uint nBufferSize,
        IntPtr lpBytesRead,
        out uint lpTotalBytesAvail,
        IntPtr lpBytesLeftThisMessage);

    private static string ReadBootstrapLineV2(string label, int maximumBytes)
    {
        StringBuilder value = new StringBuilder();
        while (true)
        {
            int raw = Console.In.Read();
            if (raw < 0) throw new EndOfStreamException("missing required line: " + label);
            V2BootstrapBytesRead += 1;
            if (V2BootstrapBytesRead > V2_BOOTSTRAP_MAX_BYTES) throw new InvalidDataException("bootstrap exceeds 1 MiB");
            char current = (char)raw;
            if (current > 0x7f) throw new InvalidDataException("bootstrap must be ASCII encoded");
            if (current == '\n')
            {
                if (value.Length > 0 && value[value.Length - 1] == '\r') value.Length -= 1;
                return value.ToString();
            }
            value.Append(current);
            if (value.Length > maximumBytes) throw new InvalidDataException("bootstrap line exceeds limit: " + label);
        }
    }

    private static byte[] DecodeBytesLineV2(string label)
    {
        int maximumEncodedBytes = ((V2_BOOTSTRAP_DECODED_LINE_MAX_BYTES + 2) / 3) * 4;
        string encoded = ReadBootstrapLineV2(label, maximumEncodedBytes);
        byte[] decoded;
        try { decoded = Convert.FromBase64String(encoded); }
        catch (FormatException error) { throw new InvalidDataException("invalid base64 line: " + label, error); }
        if (decoded.Length > V2_BOOTSTRAP_DECODED_LINE_MAX_BYTES)
        {
            throw new InvalidDataException("decoded bootstrap line exceeds 64 KiB: " + label);
        }
        return decoded;
    }

    private static string DecodeStringLineV2(string label)
    {
        try { return new UTF8Encoding(false, true).GetString(DecodeBytesLineV2(label)); }
        catch (DecoderFallbackException error) { throw new InvalidDataException("invalid UTF-8 line: " + label, error); }
    }

    private static RunnerSpecV2 ReadSpecV2()
    {
        V2BootstrapBytesRead = 0;
        string protocol = ReadBootstrapLineV2("protocol", V2_BOOTSTRAP_DECODED_LINE_MAX_BYTES);
        if (!String.Equals(protocol, V2_PROTOCOL_ID, StringComparison.Ordinal)) throw new InvalidDataException("unsupported protocol: " + protocol);
        RunnerSpecV2 spec = new RunnerSpecV2();
        spec.RunId = DecodeStringLineV2("runId");
        uint parentPid;
        if (!UInt32.TryParse(ReadBootstrapLineV2("parentPid", V2_BOOTSTRAP_DECODED_LINE_MAX_BYTES), out parentPid) || parentPid == 0) throw new InvalidDataException("invalid parentPid");
        spec.ParentPid = parentPid;
        spec.ControlPipeName = DecodeStringLineV2("controlPipeName");
        byte[] controlToken = DecodeBytesLineV2("controlToken");
        if (controlToken.Length != 32) throw new InvalidDataException("controlToken must encode exactly 32 bytes");
        spec.ControlToken = Convert.ToBase64String(controlToken);

        RunnerSpec command = new RunnerSpec();
        command.ExecutablePath = DecodeStringLineV2("executablePath");
        command.WorkingDirectory = DecodeStringLineV2("workingDirectory");
        command.EvidencePath = DecodeStringLineV2("evidencePath");
        int timeoutMs;
        if (!Int32.TryParse(ReadBootstrapLineV2("timeoutMs", V2_BOOTSTRAP_DECODED_LINE_MAX_BYTES), out timeoutMs) || timeoutMs <= 0) throw new InvalidDataException("invalid timeoutMs");
        command.TimeoutMs = timeoutMs;
        int argumentCount;
        if (!Int32.TryParse(ReadBootstrapLineV2("argumentCount", V2_BOOTSTRAP_DECODED_LINE_MAX_BYTES), out argumentCount) || argumentCount < 0 || argumentCount > 4096)
        {
            throw new InvalidDataException("invalid argumentCount");
        }
        command.Arguments = new List<string>(argumentCount);
        for (int index = 0; index < argumentCount; index += 1) command.Arguments.Add(DecodeStringLineV2("argument-" + index));
        if (String.IsNullOrWhiteSpace(spec.RunId) || spec.RunId.Length > 1024) throw new InvalidDataException("invalid runId");
        if (String.IsNullOrWhiteSpace(spec.ControlPipeName)
            || !spec.ControlPipeName.StartsWith("\\\\.\\pipe\\", StringComparison.Ordinal)
            || spec.ControlPipeName.IndexOfAny(new char[] { '\r', '\n' }) >= 0) throw new InvalidDataException("invalid controlPipeName");
        if (String.IsNullOrWhiteSpace(command.ExecutablePath)) throw new InvalidDataException("executablePath is required");
        if (String.IsNullOrWhiteSpace(command.WorkingDirectory) || !Path.IsPathRooted(command.WorkingDirectory)) throw new InvalidDataException("workingDirectory must be absolute");
        if (String.IsNullOrWhiteSpace(command.EvidencePath) || !Path.IsPathRooted(command.EvidencePath)) throw new InvalidDataException("evidencePath must be absolute");
        spec.Command = command;
        return spec;
    }

    private static void InitializeCreationAttributesV2(
        IntPtr inputHandle,
        IntPtr outputHandle,
        IntPtr errorHandle,
        IntPtr jobHandle,
        out IntPtr attributeList,
        out IntPtr handleList,
        out IntPtr jobList)
    {
        attributeList = IntPtr.Zero;
        handleList = IntPtr.Zero;
        jobList = IntPtr.Zero;
        bool initialized = false;
        try
        {
            IntPtr size = IntPtr.Zero;
            InitializeProcThreadAttributeList(IntPtr.Zero, 2, 0, ref size);
            if (size == IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error(), "InitializeProcThreadAttributeList V2 size query failed");
            attributeList = Marshal.AllocHGlobal(size);
            if (!InitializeProcThreadAttributeList(attributeList, 2, 0, ref size)) throw new Win32Exception(Marshal.GetLastWin32Error(), "InitializeProcThreadAttributeList V2 failed");
            initialized = true;
            handleList = Marshal.AllocHGlobal(IntPtr.Size * 3);
            Marshal.WriteIntPtr(handleList, 0, inputHandle);
            Marshal.WriteIntPtr(handleList, IntPtr.Size, outputHandle);
            Marshal.WriteIntPtr(handleList, IntPtr.Size * 2, errorHandle);
            if (!UpdateProcThreadAttribute(attributeList, 0, PROC_THREAD_ATTRIBUTE_HANDLE_LIST, handleList, new IntPtr(IntPtr.Size * 3), IntPtr.Zero, IntPtr.Zero))
            {
                throw new Win32Exception(Marshal.GetLastWin32Error(), "UpdateProcThreadAttribute V2 handle list failed");
            }
            jobList = Marshal.AllocHGlobal(IntPtr.Size);
            Marshal.WriteIntPtr(jobList, 0, jobHandle);
            if (!UpdateProcThreadAttribute(attributeList, 0, PROC_THREAD_ATTRIBUTE_JOB_LIST, jobList, new IntPtr(IntPtr.Size), IntPtr.Zero, IntPtr.Zero))
            {
                throw new Win32Exception(Marshal.GetLastWin32Error(), "UpdateProcThreadAttribute V2 Job list failed");
            }
        }
        catch
        {
            if (initialized) DeleteProcThreadAttributeList(attributeList);
            if (attributeList != IntPtr.Zero) Marshal.FreeHGlobal(attributeList);
            if (handleList != IntPtr.Zero) Marshal.FreeHGlobal(handleList);
            if (jobList != IntPtr.Zero) Marshal.FreeHGlobal(jobList);
            attributeList = IntPtr.Zero;
            handleList = IntPtr.Zero;
            jobList = IntPtr.Zero;
            throw;
        }
    }

    private static void FreeCreationAttributesV2(ref IntPtr attributeList, ref IntPtr handleList, ref IntPtr jobList)
    {
        if (attributeList != IntPtr.Zero)
        {
            DeleteProcThreadAttributeList(attributeList);
            Marshal.FreeHGlobal(attributeList);
            attributeList = IntPtr.Zero;
        }
        if (handleList != IntPtr.Zero) { Marshal.FreeHGlobal(handleList); handleList = IntPtr.Zero; }
        if (jobList != IntPtr.Zero) { Marshal.FreeHGlobal(jobList); jobList = IntPtr.Zero; }
    }

    private static string EnvelopeV2(RunnerSpecV2 spec, int sequence, string type)
    {
        return "\"schemaVersion\":2,\"protocolId\":\"" + JsonEscape(V2_PROTOCOL_ID)
            + "\",\"runId\":\"" + JsonEscape(spec.RunId)
            + "\",\"sequence\":" + sequence
            + ",\"type\":\"" + JsonEscape(type) + "\"";
    }

    private static string BuildReadyV2(ControlStateV2 state)
    {
        return "{" + EnvelopeV2(state.Spec, 1, "ready")
            + ",\"authToken\":\"" + JsonEscape(state.Spec.ControlToken) + "\""
            + ",\"helperPid\":" + state.HelperPid
            + ",\"parent\":{\"pid\":" + state.Spec.ParentPid
            + ",\"creationTimeFileTime\":\"" + JsonEscape(state.ParentCreationTimeFileTime) + "\"}}";
    }

    private static string BuildExpectedStartV2(ControlStateV2 state)
    {
        return "{" + EnvelopeV2(state.Spec, 2, "start")
            + ",\"parent\":{\"pid\":" + state.Spec.ParentPid
            + ",\"creationTimeFileTime\":\"" + JsonEscape(state.ParentCreationTimeFileTime) + "\"}"
            + ",\"authToken\":\"" + JsonEscape(state.Spec.ControlToken) + "\"}";
    }

    private static void SendMessageV2(ControlStateV2 state, string type, string fields)
    {
        lock (state.WriteLock)
        {
            int sequence = state.NextHelperSequence;
            state.NextHelperSequence += 2;
            state.Writer.WriteLine("{" + EnvelopeV2(state.Spec, sequence, type) + fields + "}");
            state.Writer.Flush();
        }
    }

    private static void SkipWhitespaceV2(JsonCursorV2 cursor)
    {
        while (cursor.Index < cursor.Source.Length && Char.IsWhiteSpace(cursor.Source[cursor.Index])) cursor.Index += 1;
    }

    private static string ParseJsonStringV2(JsonCursorV2 cursor)
    {
        SkipWhitespaceV2(cursor);
        if (cursor.Index >= cursor.Source.Length || cursor.Source[cursor.Index] != '"') throw new InvalidDataException("expected JSON string");
        cursor.Index += 1;
        StringBuilder result = new StringBuilder();
        while (cursor.Index < cursor.Source.Length)
        {
            char character = cursor.Source[cursor.Index++];
            if (character == '"') return result.ToString();
            if (character < 32) throw new InvalidDataException("invalid JSON string control character");
            if (character != '\\') { result.Append(character); continue; }
            if (cursor.Index >= cursor.Source.Length) throw new InvalidDataException("incomplete JSON escape");
            char escaped = cursor.Source[cursor.Index++];
            switch (escaped)
            {
                case '"': result.Append('"'); break;
                case '\\': result.Append('\\'); break;
                case '/': result.Append('/'); break;
                case 'b': result.Append('\b'); break;
                case 'f': result.Append('\f'); break;
                case 'n': result.Append('\n'); break;
                case 'r': result.Append('\r'); break;
                case 't': result.Append('\t'); break;
                case 'u':
                    if (cursor.Index + 4 > cursor.Source.Length) throw new InvalidDataException("incomplete JSON unicode escape");
                    int code;
                    if (!Int32.TryParse(cursor.Source.Substring(cursor.Index, 4), NumberStyles.HexNumber, CultureInfo.InvariantCulture, out code))
                    {
                        throw new InvalidDataException("invalid JSON unicode escape");
                    }
                    result.Append((char)code);
                    cursor.Index += 4;
                    break;
                default: throw new InvalidDataException("invalid JSON escape");
            }
        }
        throw new InvalidDataException("unterminated JSON string");
    }

    private static string ParseJsonPrimitiveV2(JsonCursorV2 cursor)
    {
        SkipWhitespaceV2(cursor);
        int start = cursor.Index;
        while (cursor.Index < cursor.Source.Length
            && cursor.Source[cursor.Index] != ','
            && cursor.Source[cursor.Index] != '}'
            && cursor.Source[cursor.Index] != ']'
            && !Char.IsWhiteSpace(cursor.Source[cursor.Index])) cursor.Index += 1;
        if (cursor.Index == start) throw new InvalidDataException("missing JSON primitive");
        string value = cursor.Source.Substring(start, cursor.Index - start);
        if (value == "true" || value == "false" || value == "null") return value;
        double number;
        if (!Double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out number)) throw new InvalidDataException("invalid JSON primitive");
        return value;
    }

    private static void ParseJsonValueV2(JsonCursorV2 cursor)
    {
        SkipWhitespaceV2(cursor);
        if (cursor.Index >= cursor.Source.Length) throw new InvalidDataException("missing JSON value");
        char token = cursor.Source[cursor.Index];
        if (token == '"') { ParseJsonStringV2(cursor); return; }
        if (token == '{')
        {
            cursor.Index += 1;
            SkipWhitespaceV2(cursor);
            if (cursor.Index < cursor.Source.Length && cursor.Source[cursor.Index] == '}') { cursor.Index += 1; return; }
            while (true)
            {
                ParseJsonStringV2(cursor);
                SkipWhitespaceV2(cursor);
                if (cursor.Index >= cursor.Source.Length || cursor.Source[cursor.Index++] != ':') throw new InvalidDataException("missing JSON colon");
                ParseJsonValueV2(cursor);
                SkipWhitespaceV2(cursor);
                if (cursor.Index >= cursor.Source.Length) throw new InvalidDataException("unterminated JSON object");
                char separator = cursor.Source[cursor.Index++];
                if (separator == '}') return;
                if (separator != ',') throw new InvalidDataException("invalid JSON object separator");
            }
        }
        if (token == '[')
        {
            cursor.Index += 1;
            SkipWhitespaceV2(cursor);
            if (cursor.Index < cursor.Source.Length && cursor.Source[cursor.Index] == ']') { cursor.Index += 1; return; }
            while (true)
            {
                ParseJsonValueV2(cursor);
                SkipWhitespaceV2(cursor);
                if (cursor.Index >= cursor.Source.Length) throw new InvalidDataException("unterminated JSON array");
                char separator = cursor.Source[cursor.Index++];
                if (separator == ']') return;
                if (separator != ',') throw new InvalidDataException("invalid JSON array separator");
            }
        }
        ParseJsonPrimitiveV2(cursor);
    }

    private static void ValidateJsonDocumentV2(string source)
    {
        JsonCursorV2 cursor = new JsonCursorV2();
        cursor.Source = source;
        ParseJsonValueV2(cursor);
        SkipWhitespaceV2(cursor);
        if (cursor.Index != source.Length) throw new InvalidDataException("trailing JSON content");
    }

    private static Dictionary<string, string> ParseFlatObjectV2(string source)
    {
        JsonCursorV2 cursor = new JsonCursorV2();
        cursor.Source = source;
        Dictionary<string, string> fields = new Dictionary<string, string>(StringComparer.Ordinal);
        SkipWhitespaceV2(cursor);
        if (cursor.Index >= source.Length || source[cursor.Index++] != '{') throw new InvalidDataException("control message must be a JSON object");
        while (true)
        {
            SkipWhitespaceV2(cursor);
            if (cursor.Index < source.Length && source[cursor.Index] == '}') { cursor.Index += 1; break; }
            string key = ParseJsonStringV2(cursor);
            if (fields.ContainsKey(key)) throw new InvalidDataException("duplicate control field: " + key);
            SkipWhitespaceV2(cursor);
            if (cursor.Index >= source.Length || source[cursor.Index++] != ':') throw new InvalidDataException("missing control field colon");
            SkipWhitespaceV2(cursor);
            string value = cursor.Index < source.Length && source[cursor.Index] == '"' ? ParseJsonStringV2(cursor) : ParseJsonPrimitiveV2(cursor);
            fields.Add(key, value);
            SkipWhitespaceV2(cursor);
            if (cursor.Index >= source.Length) throw new InvalidDataException("unterminated control object");
            char separator = source[cursor.Index++];
            if (separator == '}') break;
            if (separator != ',') throw new InvalidDataException("invalid control field separator");
        }
        SkipWhitespaceV2(cursor);
        if (cursor.Index != source.Length) throw new InvalidDataException("trailing control JSON content");
        return fields;
    }

    private static int ParseRequiredIntV2(Dictionary<string, string> fields, string key)
    {
        int value;
        if (!fields.ContainsKey(key) || !Int32.TryParse(fields[key], NumberStyles.Integer, CultureInfo.InvariantCulture, out value))
        {
            throw new InvalidDataException("invalid control integer: " + key);
        }
        return value;
    }

    private static string RequiredControlStringV2(Dictionary<string, string> fields, string key)
    {
        string value;
        if (!fields.TryGetValue(key, out value) || String.IsNullOrWhiteSpace(value)) throw new InvalidDataException("invalid control string: " + key);
        return value;
    }

    private static bool TrySetFirstCauseV2(ControlStateV2 state, int cause, string error)
    {
        lock (state.WriteLock)
        {
            if (Interlocked.CompareExchange(ref state.FirstCause, cause, V2_CAUSE_NONE) != V2_CAUSE_NONE) return false;
            state.Error = error;
        }
        if (!SetEvent(state.PrimaryCauseEvent)) state.Error = new Win32Exception(Marshal.GetLastWin32Error(), "SetEvent(primary cause) failed").ToString();
        return true;
    }

    private static string CauseNameV2(int cause)
    {
        switch (cause)
        {
            case V2_CAUSE_ROOT_EXIT: return "root-exit";
            case V2_CAUSE_PARENT_DEATH: return "parent-death";
            case V2_CAUSE_EXPLICIT_CANCEL: return "cancel-requested";
            case V2_CAUSE_CONTROL_LOSS: return "control-loss";
            case V2_CAUSE_TIMEOUT: return "timeout";
            default: return "setup-error";
        }
    }

    private static string ValidateCancelV2(ControlStateV2 state, string line)
    {
        Dictionary<string, string> fields = ParseFlatObjectV2(line);
        if (fields.Count != 10
            || ParseRequiredIntV2(fields, "schemaVersion") != 2
            || !String.Equals(RequiredControlStringV2(fields, "protocolId"), V2_PROTOCOL_ID, StringComparison.Ordinal)
            || !String.Equals(RequiredControlStringV2(fields, "runId"), state.Spec.RunId, StringComparison.Ordinal)
            || ParseRequiredIntV2(fields, "sequence") != state.NextNodeSequence
            || !String.Equals(RequiredControlStringV2(fields, "type"), "cancel", StringComparison.Ordinal)
            || !String.Equals(RequiredControlStringV2(fields, "cause"), "cancel-requested", StringComparison.Ordinal))
        {
            throw new InvalidDataException("invalid cancel envelope");
        }
        string reasonCode = RequiredControlStringV2(fields, "reasonCode");
        if (Encoding.UTF8.GetByteCount(reasonCode) > V2_CANCEL_REASON_MAX_BYTES) throw new InvalidDataException("cancel reasonCode exceeds 128 UTF-8 bytes");
        string requestedSignal = RequiredControlStringV2(fields, "requestedSignal");
        if (!String.Equals(requestedSignal, "SIGINT", StringComparison.Ordinal)
            && !String.Equals(requestedSignal, "SIGTERM", StringComparison.Ordinal)) throw new InvalidDataException("invalid requestedSignal");
        RequiredControlStringV2(fields, "requestedAt");
        string requestId = RequiredControlStringV2(fields, "requestId");
        state.NextNodeSequence += 2;
        return requestId;
    }

    private static void RecordControlFailureV2(ControlStateV2 state, string error)
    {
        for (int attempt = 0; attempt < 10; attempt += 1)
        {
            if (WaitForSingleObject(state.ParentHandle, 0) == WAIT_OBJECT_0)
            {
                TrySetFirstCauseV2(state, V2_CAUSE_PARENT_DEATH, error);
                return;
            }
            Thread.Sleep(10);
        }
        TrySetFirstCauseV2(state, V2_CAUSE_CONTROL_LOSS, error);
    }

    private static string ReadControlLineV2(ControlStateV2 state)
    {
        while (true)
        {
            uint available;
            if (!PeekNamedPipe(state.ReadPipeHandle, IntPtr.Zero, 0, IntPtr.Zero, out available, IntPtr.Zero))
            {
                throw new Win32Exception(Marshal.GetLastWin32Error(), "PeekNamedPipe(control) failed");
            }
            if (available > 0)
            {
                StringBuilder line = new StringBuilder();
                char[] currentBuffer = new char[1];
                int lineBytes = 0;
                while (true)
                {
                    int raw = state.Reader.Read();
                    if (raw < 0) throw new EndOfStreamException("control pipe closed mid-message");
                    char current = (char)raw;
                    if (current == '\n')
                    {
                        if (line.Length > 0 && line[line.Length - 1] == '\r') line.Length -= 1;
                        return line.ToString();
                    }
                    currentBuffer[0] = current;
                    lineBytes += Encoding.UTF8.GetByteCount(currentBuffer);
                    if (lineBytes > V2_CONTROL_MESSAGE_MAX_BYTES) throw new InvalidDataException("control message exceeds 16 KiB");
                    line.Append(current);
                }
            }
            if (WaitForSingleObject(state.ParentHandle, 0) == WAIT_OBJECT_0) return null;
            Thread.Sleep(10);
        }
    }

    private static void ReadControlPipeV2(object stateObject)
    {
        ControlStateV2 state = (ControlStateV2)stateObject;
        try
        {
            string startLine = ReadControlLineV2(state);
            state.StartAckVerified = String.Equals(startLine, BuildExpectedStartV2(state), StringComparison.Ordinal);
            if (!state.StartAckVerified) state.Error = startLine == null ? "control pipe closed before start ACK" : "invalid authenticated start ACK";
            else lock (state.WriteLock) state.NextNodeSequence = 4;
        }
        catch (Exception error) { state.Error = error.ToString(); }
        finally { state.StartAckCompleted.Set(); }
        if (!state.StartAckVerified) return;

        try
        {
            string line = ReadControlLineV2(state);
            if (line == null) { RecordControlFailureV2(state, "control pipe reached EOF"); return; }
            bool accepted;
            int primaryCause;
            lock (state.WriteLock)
            {
                string requestId = ValidateCancelV2(state, line);
                if (state.TerminalCommitted) return;
                accepted = Interlocked.CompareExchange(ref state.FirstCause, V2_CAUSE_EXPLICIT_CANCEL, V2_CAUSE_NONE) == V2_CAUSE_NONE;
                if (accepted) state.CancelRequestId = requestId;
                else state.SecondaryCauses.Add("cancel-requested");
                primaryCause = Volatile.Read(ref state.FirstCause);
                int sequence = state.NextHelperSequence;
                state.NextHelperSequence += 2;
                state.Writer.WriteLine("{" + EnvelopeV2(state.Spec, sequence, "cancel-accepted")
                    + ",\"requestId\":\"" + JsonEscape(requestId)
                    + "\",\"accepted\":" + accepted.ToString().ToLowerInvariant()
                    + ",\"primaryCause\":\"" + JsonEscape(CauseNameV2(primaryCause)) + "\"}");
                state.Writer.Flush();
            }
            if (accepted && !SetEvent(state.PrimaryCauseEvent))
            {
                state.Error = new Win32Exception(Marshal.GetLastWin32Error(), "SetEvent(cancel) failed").ToString();
            }
        }
        catch (Exception error) { RecordControlFailureV2(state, error.ToString()); }
    }

    private static uint QueryActiveJobProcessesV2(IntPtr jobHandle)
    {
        int size = Marshal.SizeOf(typeof(JOBOBJECT_BASIC_ACCOUNTING_INFORMATION));
        IntPtr buffer = Marshal.AllocHGlobal(size);
        try
        {
            uint returned;
            if (!QueryInformationJobObject(jobHandle, JobObjectBasicAccountingInformation, buffer, (uint)size, out returned))
            {
                throw new Win32Exception(Marshal.GetLastWin32Error(), "QueryInformationJobObject accounting failed");
            }
            JOBOBJECT_BASIC_ACCOUNTING_INFORMATION information = (JOBOBJECT_BASIC_ACCOUNTING_INFORMATION)Marshal.PtrToStructure(
                buffer,
                typeof(JOBOBJECT_BASIC_ACCOUNTING_INFORMATION));
            return information.ActiveProcesses;
        }
        finally { Marshal.FreeHGlobal(buffer); }
    }

    private static uint WaitForZeroActiveJobProcessesV2(IntPtr jobHandle, int timeoutMs)
    {
        Stopwatch wait = Stopwatch.StartNew();
        uint active = QueryActiveJobProcessesV2(jobHandle);
        while (active != 0 && wait.ElapsedMilliseconds < timeoutMs)
        {
            Thread.Sleep(10);
            active = QueryActiveJobProcessesV2(jobHandle);
        }
        return active;
    }

    private static string UtcTimestampV2()
    {
        return DateTime.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", CultureInfo.InvariantCulture);
    }

    private static string StringArrayV2(IEnumerable<string> values)
    {
        List<string> encoded = new List<string>();
        foreach (string value in values) encoded.Add("\"" + JsonEscape(value) + "\"");
        return "[" + String.Join(",", encoded.ToArray()) + "]";
    }

    private static string BuildEvidenceV2(
        RunnerSpecV2 spec,
        uint helperPid,
        string status,
        string primaryCause,
        IEnumerable<string> secondaryCauses,
        string started,
        string rootResumed,
        string cleanupStarted,
        string finished,
        string parentCreationTimeFileTime,
        bool parentDeathObserved,
        uint rootPid,
        string rootCreationTimeFileTime,
        int rootExitCode,
        bool rootTerminationConfirmed,
        uint activeProcessesAtCleanupStart,
        uint activeProcessesAfterCleanup,
        List<uint> processIdsAtCleanupStart,
        List<uint> remainingPids,
        List<uint> unverifiedPids,
        bool terminateSucceeded,
        bool jobCloseSucceeded,
        string cancelRequestId,
        long cleanupWaitMs,
        bool cleanupVerified,
        string error)
    {
        return "{" +
            "\"schemaVersion\":2," +
            "\"kind\":\"scenario-forge-windows-job-run\"," +
            "\"protocolId\":\"" + V2_PROTOCOL_ID + "\"," +
            "\"provider\":\"windows-job-object\"," +
            "\"status\":\"" + JsonEscape(status) + "\"," +
            "\"primaryCause\":\"" + JsonEscape(primaryCause) + "\"," +
            "\"secondaryCauses\":" + StringArrayV2(secondaryCauses) + "," +
            "\"runId\":\"" + JsonEscape(spec.RunId) + "\"," +
            "\"helperPid\":" + helperPid + "," +
            "\"startedAt\":\"" + started + "\"," +
            "\"rootResumedAt\":\"" + rootResumed + "\"," +
            "\"cleanupStartedAt\":\"" + cleanupStarted + "\"," +
            "\"finishedAt\":\"" + finished + "\"," +
            "\"parent\":{\"pid\":" + spec.ParentPid
                + ",\"creationTimeFileTime\":\"" + JsonEscape(parentCreationTimeFileTime)
                + "\",\"handleOpened\":true,\"identityAcknowledged\":true,\"deathObserved\":" + parentDeathObserved.ToString().ToLowerInvariant() + "}," +
            "\"root\":{\"pid\":" + rootPid
                + ",\"creationTimeFileTime\":\"" + JsonEscape(rootCreationTimeFileTime)
                + "\",\"exitCode\":" + rootExitCode
                + ",\"createSuspended\":true,\"assignedAtCreation\":true,\"assignedBeforeResume\":true"
                + ",\"rootInJobBeforeResume\":true,\"resumed\":true,\"terminationConfirmed\":" + rootTerminationConfirmed.ToString().ToLowerInvariant() + "}," +
            "\"job\":{\"killOnJobClose\":true,\"breakawayAllowed\":false,\"jobListAtCreation\":true"
                + ",\"terminateRequested\":true,\"terminateSucceeded\":" + terminateSucceeded.ToString().ToLowerInvariant()
                + ",\"activeProcessesAtCleanupStart\":" + activeProcessesAtCleanupStart
                + ",\"activeProcessesAfterCleanup\":" + activeProcessesAfterCleanup
                + ",\"processIdsAtCleanupStart\":" + JsonArray(processIdsAtCleanupStart)
                + ",\"remainingPids\":" + JsonArray(remainingPids)
                + ",\"unverifiedPids\":" + JsonArray(unverifiedPids)
                + ",\"jobCloseSucceeded\":" + jobCloseSucceeded.ToString().ToLowerInvariant() + "}," +
            "\"control\":{\"transport\":\"named-pipe-jsonl\",\"authenticated\":true,\"startAcknowledged\":true"
                + ",\"cancelRequestId\":" + (cancelRequestId == null ? "null" : "\"" + JsonEscape(cancelRequestId) + "\"")
                + ",\"terminalMessagePrepared\":true}," +
            "\"timeoutMs\":" + spec.Command.TimeoutMs + "," +
            "\"cleanupWaitMs\":" + cleanupWaitMs + "," +
            "\"command\":{\"executablePath\":\"" + JsonEscape(spec.Command.ExecutablePath)
                + "\",\"workingDirectory\":\"" + JsonEscape(spec.Command.WorkingDirectory)
                + "\",\"arguments\":" + StringArrayV2(spec.Command.Arguments) + "}," +
            "\"cleanupVerified\":" + cleanupVerified.ToString().ToLowerInvariant() + "," +
            "\"error\":" + (error == null ? "null" : "\"" + JsonEscape(error) + "\"") +
            "}";
    }

    private static string PublishEvidenceDurablyV2(string evidencePath, string json)
    {
        string directory = Path.GetDirectoryName(evidencePath);
        if (String.IsNullOrWhiteSpace(directory)) directory = Directory.GetCurrentDirectory();
        Directory.CreateDirectory(directory);
        string tempPath = Path.Combine(directory, Path.GetFileName(evidencePath) + "." + Guid.NewGuid().ToString("N") + ".tmp");
        byte[] expected = new UTF8Encoding(false).GetBytes(json + Environment.NewLine);
        try
        {
            using (FileStream stream = new FileStream(tempPath, FileMode.CreateNew, FileAccess.Write, FileShare.None))
            {
                stream.Write(expected, 0, expected.Length);
                stream.Flush(true);
            }
            byte[] actual = File.ReadAllBytes(tempPath);
            if (actual.Length != expected.Length) throw new InvalidDataException("evidence readback length mismatch");
            for (int index = 0; index < actual.Length; index += 1)
            {
                if (actual[index] != expected[index]) throw new InvalidDataException("evidence readback bytes mismatch");
            }
            string readback = new UTF8Encoding(false, true).GetString(actual);
            ValidateJsonDocumentV2(readback);
            File.Move(tempPath, evidencePath);
            using (SHA256 sha256 = SHA256.Create()) return BitConverter.ToString(sha256.ComputeHash(actual)).Replace("-", "").ToLowerInvariant();
        }
        finally { if (File.Exists(tempPath)) File.Delete(tempPath); }
    }

    public static int RunV2()
    {
        RunnerSpecV2 spec = null;
        IntPtr parentHandle = IntPtr.Zero;
        IntPtr primaryCauseEvent = IntPtr.Zero;
        IntPtr jobHandle = IntPtr.Zero;
        IntPtr processHandle = IntPtr.Zero;
        IntPtr threadHandle = IntPtr.Zero;
        IntPtr inputHandle = IntPtr.Zero;
        IntPtr outputHandle = IntPtr.Zero;
        IntPtr errorHandle = IntPtr.Zero;
        IntPtr attributeList = IntPtr.Zero;
        IntPtr handleList = IntPtr.Zero;
        IntPtr jobList = IntPtr.Zero;
        uint helperPid = GetCurrentProcessId();
        uint rootPid = 0;
        int rootExitCode = 3;
        string rootCreationTimeFileTime = "0";
        string parentCreationTimeFileTime = "0";
        string startedAt = UtcTimestampV2();
        string rootResumedAt = null;
        string cleanupStartedAt = null;
        string finishedAt = null;
        int firstCause = V2_CAUSE_NONE;
        bool rootInJobBeforeResume = false;
        bool rootResumed = false;
        bool terminateSucceeded = false;
        bool jobCloseSucceeded = false;
        bool rootTerminationConfirmed = false;
        bool cleanupVerified = false;
        uint activeProcessesAtCleanupStart = 0;
        uint activeProcessesAfterCleanup = UInt32.MaxValue;
        long cleanupWaitMs = 0;
        string status = "invalid";
        string errorMessage = null;
        List<uint> processIdsAtCleanupStart = new List<uint>();
        List<uint> remainingPids = new List<uint>();
        List<uint> unverifiedPids = new List<uint>();
        Dictionary<uint, IntPtr> verificationHandles = new Dictionary<uint, IntPtr>();
        ControlStateV2 controlState = null;

        try
        {
            spec = ReadSpecV2();
            parentHandle = OpenProcess(SYNCHRONIZE | V2_PROCESS_QUERY_LIMITED_INFORMATION, false, spec.ParentPid);
            if (IsInvalidHandle(parentHandle)) throw new Win32Exception(Marshal.GetLastWin32Error(), "OpenProcess(parent) failed");
            if (GetProcessId(parentHandle) != spec.ParentPid) throw new InvalidOperationException("opened parentPid does not match bootstrap parentPid");
            long parentCreation;
            long ignoredExit;
            long ignoredKernel;
            long ignoredUser;
            if (!GetProcessTimes(parentHandle, out parentCreation, out ignoredExit, out ignoredKernel, out ignoredUser))
            {
                throw new Win32Exception(Marshal.GetLastWin32Error(), "GetProcessTimes(parent) failed");
            }
            parentCreationTimeFileTime = unchecked((ulong)parentCreation).ToString(CultureInfo.InvariantCulture);
            primaryCauseEvent = CreateEventW(IntPtr.Zero, true, false, null);
            if (IsInvalidHandle(primaryCauseEvent)) throw new Win32Exception(Marshal.GetLastWin32Error(), "CreateEventW(primary cause) failed");

            SECURITY_ATTRIBUTES pipeAttributes = new SECURITY_ATTRIBUTES();
            pipeAttributes.nLength = Marshal.SizeOf(typeof(SECURITY_ATTRIBUTES));
            IntPtr pipeHandle = CreateFileW(
                spec.ControlPipeName,
                GENERIC_READ | V2_GENERIC_WRITE,
                0,
                ref pipeAttributes,
                OPEN_EXISTING,
                FILE_ATTRIBUTE_NORMAL,
                IntPtr.Zero);
            if (IsInvalidHandle(pipeHandle)) throw new Win32Exception(Marshal.GetLastWin32Error(), "CreateFileW(control pipe) failed");
            IntPtr currentProcess = GetCurrentProcess();
            IntPtr writePipeHandle;
            if (!DuplicateHandle(currentProcess, pipeHandle, currentProcess, out writePipeHandle, 0, false, DUPLICATE_SAME_ACCESS))
            {
                throw new Win32Exception(Marshal.GetLastWin32Error(), "DuplicateHandle(control write pipe) failed");
            }
            SafeFileHandle safeReadPipeHandle = new SafeFileHandle(pipeHandle, true);
            pipeHandle = IntPtr.Zero;
            SafeFileHandle safeWritePipeHandle = new SafeFileHandle(writePipeHandle, true);
            writePipeHandle = IntPtr.Zero;
            FileStream readPipeStream = new FileStream(safeReadPipeHandle, FileAccess.Read, 4096, false);
            FileStream writePipeStream = new FileStream(safeWritePipeHandle, FileAccess.Write, 4096, false);
            controlState = new ControlStateV2();
            controlState.Spec = spec;
            controlState.HelperPid = helperPid;
            controlState.ParentCreationTimeFileTime = parentCreationTimeFileTime;
            controlState.ReadPipeHandle = safeReadPipeHandle.DangerousGetHandle();
            controlState.ParentHandle = parentHandle;
            controlState.Reader = new StreamReader(readPipeStream, new UTF8Encoding(false, true), false, 4096);
            controlState.Writer = new StreamWriter(writePipeStream, new UTF8Encoding(false), 4096);
            controlState.Writer.NewLine = "\n";
            controlState.PrimaryCauseEvent = primaryCauseEvent;
            controlState.Writer.WriteLine(BuildReadyV2(controlState));
            controlState.Writer.Flush();
            Thread controlThread = new Thread(new ParameterizedThreadStart(ReadControlPipeV2));
            controlThread.IsBackground = true;
            controlThread.Name = "ScenarioForgeWindowsJobRunnerV2Control";
            controlThread.Start(controlState);

            IntPtr startAckHandle = controlState.StartAckCompleted.SafeWaitHandle.DangerousGetHandle();
            uint startWait = WaitForMultipleObjects(2, new IntPtr[] { startAckHandle, parentHandle }, false, 5000);
            if (startWait == V2_WAIT_FAILED) throw new Win32Exception(Marshal.GetLastWin32Error(), "WaitForMultipleObjects(start ACK) failed");
            if (startWait == WAIT_TIMEOUT) throw new TimeoutException("authenticated start ACK timed out");
            if (startWait == WAIT_OBJECT_0 + 1) throw new InvalidOperationException("parent exited before authenticated start ACK");
            if (startWait != WAIT_OBJECT_0 || !controlState.StartAckVerified) throw new InvalidDataException(controlState.Error ?? "authenticated start ACK rejected");

            jobHandle = CreateJobObject(IntPtr.Zero, null);
            if (IsInvalidHandle(jobHandle)) throw new Win32Exception(Marshal.GetLastWin32Error(), "CreateJobObject V2 failed");
            ConfigureJob(jobHandle);
            inputHandle = CreateNullInputHandle();
            outputHandle = DuplicateStandardHandle(STD_OUTPUT_HANDLE);
            errorHandle = DuplicateStandardHandle(STD_ERROR_HANDLE);
            InitializeCreationAttributesV2(inputHandle, outputHandle, errorHandle, jobHandle, out attributeList, out handleList, out jobList);
            STARTUPINFOEX startup = new STARTUPINFOEX();
            startup.StartupInfo.cb = Marshal.SizeOf(typeof(STARTUPINFOEX));
            startup.StartupInfo.dwFlags = (int)STARTF_USESTDHANDLES;
            startup.StartupInfo.hStdInput = inputHandle;
            startup.StartupInfo.hStdOutput = outputHandle;
            startup.StartupInfo.hStdError = errorHandle;
            startup.lpAttributeList = attributeList;
            PROCESS_INFORMATION processInformation;
            StringBuilder commandLine = new StringBuilder(BuildCommandLine(spec.Command));
            bool created = CreateProcessW(
                spec.Command.ExecutablePath,
                commandLine,
                IntPtr.Zero,
                IntPtr.Zero,
                true,
                CREATE_SUSPENDED | CREATE_NO_WINDOW | EXTENDED_STARTUPINFO_PRESENT,
                IntPtr.Zero,
                spec.Command.WorkingDirectory,
                ref startup,
                out processInformation);
            int createError = created ? 0 : Marshal.GetLastWin32Error();
            FreeCreationAttributesV2(ref attributeList, ref handleList, ref jobList);
            CloseIfValid(ref inputHandle);
            CloseIfValid(ref outputHandle);
            CloseIfValid(ref errorHandle);
            if (!created) throw new Win32Exception(createError, "CreateProcessW V2 failed");
            processHandle = processInformation.hProcess;
            threadHandle = processInformation.hThread;
            rootPid = processInformation.dwProcessId;
            long rootCreation;
            if (!GetProcessTimes(processHandle, out rootCreation, out ignoredExit, out ignoredKernel, out ignoredUser))
            {
                throw new Win32Exception(Marshal.GetLastWin32Error(), "GetProcessTimes(root) failed");
            }
            rootCreationTimeFileTime = unchecked((ulong)rootCreation).ToString(CultureInfo.InvariantCulture);
            if (!IsProcessInJob(processHandle, jobHandle, out rootInJobBeforeResume)) throw new Win32Exception(Marshal.GetLastWin32Error(), "IsProcessInJob V2 failed");
            if (!rootInJobBeforeResume) throw new InvalidOperationException("V2 root is outside creation-time Job");
            if (ResumeThread(threadHandle) == UInt32.MaxValue) throw new Win32Exception(Marshal.GetLastWin32Error(), "ResumeThread V2 failed");
            rootResumed = true;
            rootResumedAt = UtcTimestampV2();
            SendMessageV2(
                controlState,
                "started",
                ",\"helperPid\":" + helperPid + ",\"rootPid\":" + rootPid
                    + ",\"assignedAtCreation\":true,\"rootInJobBeforeResume\":true");

            IntPtr[] terminalWaitHandles = new IntPtr[] { primaryCauseEvent, parentHandle, processHandle };
            uint terminalWait = WaitForMultipleObjects(3, terminalWaitHandles, false, (uint)spec.Command.TimeoutMs);
            if (terminalWait == V2_WAIT_FAILED) throw new Win32Exception(Marshal.GetLastWin32Error(), "WaitForMultipleObjects terminal failed");
            if (terminalWait == WAIT_TIMEOUT) TrySetFirstCauseV2(controlState, V2_CAUSE_TIMEOUT, null);
            else if (terminalWait == WAIT_OBJECT_0 + 1) TrySetFirstCauseV2(controlState, V2_CAUSE_PARENT_DEATH, null);
            else if (terminalWait == WAIT_OBJECT_0 + 2) TrySetFirstCauseV2(controlState, V2_CAUSE_ROOT_EXIT, null);
            else if (terminalWait != WAIT_OBJECT_0) throw new InvalidOperationException("unexpected terminal wait result: " + terminalWait);
            firstCause = Volatile.Read(ref controlState.FirstCause);
            if (firstCause == V2_CAUSE_NONE) throw new InvalidOperationException("terminal cause was not recorded");

            cleanupStartedAt = UtcTimestampV2();
            Stopwatch cleanupWait = Stopwatch.StartNew();
            processIdsAtCleanupStart = QueryJobProcessIds(jobHandle);
            if (!processIdsAtCleanupStart.Contains(rootPid)) processIdsAtCleanupStart.Add(rootPid);
            activeProcessesAtCleanupStart = QueryActiveJobProcessesV2(jobHandle);
            verificationHandles = CaptureProcessHandles(processIdsAtCleanupStart, rootPid, unverifiedPids);
            terminateSucceeded = TerminateJobObject(jobHandle, V2_CLEANUP_EXIT_CODE);
            if (!terminateSucceeded) throw new Win32Exception(Marshal.GetLastWin32Error(), "TerminateJobObject V2 cleanup failed");
            rootTerminationConfirmed = WaitForSingleObject(processHandle, 5000) == WAIT_OBJECT_0;
            if (!rootTerminationConfirmed) throw new InvalidOperationException("V2 root termination was not confirmed");
            uint nativeExitCode;
            if (!GetExitCodeProcess(processHandle, out nativeExitCode)) throw new Win32Exception(Marshal.GetLastWin32Error(), "GetExitCodeProcess V2 failed");
            rootExitCode = unchecked((int)nativeExitCode);
            remainingPids = WaitForCapturedProcesses(verificationHandles, unverifiedPids);
            activeProcessesAfterCleanup = WaitForZeroActiveJobProcessesV2(jobHandle, 5000);
            cleanupWait.Stop();
            cleanupWaitMs = cleanupWait.ElapsedMilliseconds;
            jobCloseSucceeded = CloseJobHandle(ref jobHandle);
            if (!jobCloseSucceeded) throw new Win32Exception(Marshal.GetLastWin32Error(), "CloseHandle(Job V2) failed");
            cleanupVerified = rootResumed
                && rootInJobBeforeResume
                && terminateSucceeded
                && rootTerminationConfirmed
                && jobCloseSucceeded
                && activeProcessesAfterCleanup == 0
                && remainingPids.Count == 0
                && unverifiedPids.Count == 0;
            if (!cleanupVerified) throw new InvalidOperationException("V2 cleanup evidence was incomplete");
            status = "complete";
            errorMessage = null;
            finishedAt = UtcTimestampV2();
            string primaryCause = CauseNameV2(firstCause);
            List<string> terminalSecondaryCauses;
            string terminalCancelRequestId;
            lock (controlState.WriteLock)
            {
                controlState.TerminalCommitted = true;
                terminalSecondaryCauses = new List<string>(controlState.SecondaryCauses);
                terminalCancelRequestId = controlState.CancelRequestId;
            }
            string evidenceJson = BuildEvidenceV2(
                spec,
                helperPid,
                status,
                primaryCause,
                terminalSecondaryCauses,
                startedAt,
                rootResumedAt,
                cleanupStartedAt,
                finishedAt,
                parentCreationTimeFileTime,
                firstCause == V2_CAUSE_PARENT_DEATH,
                rootPid,
                rootCreationTimeFileTime,
                rootExitCode,
                rootTerminationConfirmed,
                activeProcessesAtCleanupStart,
                activeProcessesAfterCleanup,
                processIdsAtCleanupStart,
                remainingPids,
                unverifiedPids,
                terminateSucceeded,
                jobCloseSucceeded,
                terminalCancelRequestId,
                cleanupWaitMs,
                cleanupVerified,
                null);
            string evidenceSha256 = PublishEvidenceDurablyV2(spec.Command.EvidencePath, evidenceJson);
            SendMessageV2(
                controlState,
                "terminal",
                ",\"rootExitCode\":" + rootExitCode
                    + ",\"cleanupVerified\":true,\"status\":\"complete\",\"primaryCause\":\"" + JsonEscape(primaryCause)
                    + "\",\"evidenceSha256\":\"" + evidenceSha256 + "\"");
        }
        catch (Exception error)
        {
            errorMessage = error.ToString();
            Console.Error.WriteLine(errorMessage);
            try
            {
                if (!IsInvalidHandle(jobHandle))
                {
                    terminateSucceeded = TerminateJobObject(jobHandle, V2_CLEANUP_EXIT_CODE);
                    if (!IsInvalidHandle(processHandle)) rootTerminationConfirmed = WaitForSingleObject(processHandle, 5000) == WAIT_OBJECT_0;
                    activeProcessesAfterCleanup = WaitForZeroActiveJobProcessesV2(jobHandle, 5000);
                    jobCloseSucceeded = CloseJobHandle(ref jobHandle);
                }
                else if (!IsInvalidHandle(processHandle))
                {
                    rootTerminationConfirmed = TerminateProcess(processHandle, V2_CLEANUP_EXIT_CODE)
                        && WaitForSingleObject(processHandle, 5000) == WAIT_OBJECT_0;
                }
            }
            catch (Exception cleanupError) { Console.Error.WriteLine(cleanupError.ToString()); }
            status = "invalid";
            cleanupVerified = false;
        }
        finally
        {
            FreeCreationAttributesV2(ref attributeList, ref handleList, ref jobList);
            CloseIfValid(ref inputHandle);
            CloseIfValid(ref outputHandle);
            CloseIfValid(ref errorHandle);
            CloseIfValid(ref threadHandle);
            CloseIfValid(ref processHandle);
            CloseIfValid(ref parentHandle);
            if (!IsInvalidHandle(jobHandle)) jobCloseSucceeded = CloseJobHandle(ref jobHandle);
        }
        return String.Equals(status, "complete", StringComparison.Ordinal) ? 0 : 3;
    }
}

internal static class ScenarioForgeWindowsJobRunnerV2
{
    public static int Main()
    {
        return ScenarioForgeWindowsJobRunnerCore.RunV2();
    }
}
