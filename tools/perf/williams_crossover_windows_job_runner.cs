using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;

internal static class ScenarioForgeWilliamsJobRunner
{
    private const string ProtocolId = "SF_WILLIAMS_JOB_V1";
    private const uint CREATE_SUSPENDED = 0x00000004;
    private const uint CREATE_NO_WINDOW = 0x08000000;
    private const uint EXTENDED_STARTUPINFO_PRESENT = 0x00080000;
    private const uint STARTF_USESTDHANDLES = 0x00000100;
    private const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000;
    private const uint DUPLICATE_SAME_ACCESS = 0x00000002;
    private const uint HANDLE_FLAG_INHERIT = 0x00000001;
    private const uint GENERIC_READ = 0x80000000;
    private const uint FILE_SHARE_READ = 0x00000001;
    private const uint FILE_SHARE_WRITE = 0x00000002;
    private const uint OPEN_EXISTING = 3;
    private const uint FILE_ATTRIBUTE_NORMAL = 0x00000080;
    private const uint SYNCHRONIZE = 0x00100000;
    private const uint WAIT_OBJECT_0 = 0;
    private const uint WAIT_TIMEOUT = 258;
    private const int ERROR_INVALID_PARAMETER = 87;
    private const int STD_INPUT_HANDLE = -10;
    private const int STD_OUTPUT_HANDLE = -11;
    private const int STD_ERROR_HANDLE = -12;
    private const int JobObjectBasicProcessIdList = 3;
    private const int JobObjectExtendedLimitInformation = 9;
    private static readonly IntPtr PROC_THREAD_ATTRIBUTE_HANDLE_LIST = new IntPtr(0x00020002);

    [StructLayout(LayoutKind.Sequential)]
    private struct SECURITY_ATTRIBUTES
    {
        public int nLength;
        public IntPtr lpSecurityDescriptor;
        [MarshalAs(UnmanagedType.Bool)] public bool bInheritHandle;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct STARTUPINFO
    {
        public int cb;
        public string lpReserved;
        public string lpDesktop;
        public string lpTitle;
        public int dwX;
        public int dwY;
        public int dwXSize;
        public int dwYSize;
        public int dwXCountChars;
        public int dwYCountChars;
        public int dwFillAttribute;
        public int dwFlags;
        public short wShowWindow;
        public short cbReserved2;
        public IntPtr lpReserved2;
        public IntPtr hStdInput;
        public IntPtr hStdOutput;
        public IntPtr hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct STARTUPINFOEX
    {
        public STARTUPINFO StartupInfo;
        public IntPtr lpAttributeList;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct PROCESS_INFORMATION
    {
        public IntPtr hProcess;
        public IntPtr hThread;
        public uint dwProcessId;
        public uint dwThreadId;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_BASIC_LIMIT_INFORMATION
    {
        public long PerProcessUserTimeLimit;
        public long PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize;
        public UIntPtr MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass;
        public uint SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct IO_COUNTERS
    {
        public ulong ReadOperationCount;
        public ulong WriteOperationCount;
        public ulong OtherOperationCount;
        public ulong ReadTransferCount;
        public ulong WriteTransferCount;
        public ulong OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
    {
        public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
        public IO_COUNTERS IoInfo;
        public UIntPtr ProcessMemoryLimit;
        public UIntPtr JobMemoryLimit;
        public UIntPtr PeakProcessMemoryUsed;
        public UIntPtr PeakJobMemoryUsed;
    }

    private sealed class RunnerSpec
    {
        public string ExecutablePath;
        public string WorkingDirectory;
        public string EvidencePath;
        public int TimeoutMs;
        public List<string> Arguments;
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool CreateProcessW(
        string lpApplicationName,
        StringBuilder lpCommandLine,
        IntPtr lpProcessAttributes,
        IntPtr lpThreadAttributes,
        [MarshalAs(UnmanagedType.Bool)] bool bInheritHandles,
        uint dwCreationFlags,
        IntPtr lpEnvironment,
        string lpCurrentDirectory,
        ref STARTUPINFOEX lpStartupInfo,
        out PROCESS_INFORMATION lpProcessInformation);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr CreateJobObject(IntPtr lpJobAttributes, string lpName);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetInformationJobObject(
        IntPtr hJob,
        int JobObjectInfoClass,
        IntPtr lpJobObjectInfo,
        uint cbJobObjectInfoLength);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool IsProcessInJob(IntPtr processHandle, IntPtr jobHandle, out bool result);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern uint ResumeThread(IntPtr hThread);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool TerminateJobObject(IntPtr hJob, uint uExitCode);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool TerminateProcess(IntPtr hProcess, uint uExitCode);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern uint WaitForSingleObject(IntPtr hHandle, uint dwMilliseconds);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GetExitCodeProcess(IntPtr hProcess, out uint lpExitCode);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool QueryInformationJobObject(
        IntPtr hJob,
        int JobObjectInfoClass,
        IntPtr lpJobObjectInfo,
        uint cbJobObjectInfoLength,
        out uint lpReturnLength);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr OpenProcess(uint dwDesiredAccess, bool bInheritHandle, uint dwProcessId);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool CloseHandle(IntPtr hObject);

    [DllImport("kernel32.dll")]
    private static extern IntPtr GetCurrentProcess();

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr GetStdHandle(int nStdHandle);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetHandleInformation(IntPtr hObject, uint dwMask, uint dwFlags);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool DuplicateHandle(
        IntPtr hSourceProcessHandle,
        IntPtr hSourceHandle,
        IntPtr hTargetProcessHandle,
        out IntPtr lpTargetHandle,
        uint dwDesiredAccess,
        [MarshalAs(UnmanagedType.Bool)] bool bInheritHandle,
        uint dwOptions);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr CreateFileW(
        string lpFileName,
        uint dwDesiredAccess,
        uint dwShareMode,
        ref SECURITY_ATTRIBUTES lpSecurityAttributes,
        uint dwCreationDisposition,
        uint dwFlagsAndAttributes,
        IntPtr hTemplateFile);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool InitializeProcThreadAttributeList(
        IntPtr lpAttributeList,
        int dwAttributeCount,
        int dwFlags,
        ref IntPtr lpSize);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool UpdateProcThreadAttribute(
        IntPtr lpAttributeList,
        uint dwFlags,
        IntPtr attribute,
        IntPtr lpValue,
        IntPtr cbSize,
        IntPtr lpPreviousValue,
        IntPtr lpReturnSize);

    [DllImport("kernel32.dll")]
    private static extern void DeleteProcThreadAttributeList(IntPtr lpAttributeList);

    private static bool IsInvalidHandle(IntPtr handle)
    {
        return handle == IntPtr.Zero || handle == new IntPtr(-1);
    }

    private static void CloseIfValid(ref IntPtr handle)
    {
        if (!IsInvalidHandle(handle))
        {
            CloseHandle(handle);
        }
        handle = IntPtr.Zero;
    }

    private static string ReadRequiredLine(string label)
    {
        string value = Console.In.ReadLine();
        if (value == null)
        {
            throw new InvalidDataException("missing protocol line: " + label);
        }
        return value;
    }

    private static string DecodeLine(string label)
    {
        string encoded = ReadRequiredLine(label);
        try
        {
            return Encoding.UTF8.GetString(Convert.FromBase64String(encoded));
        }
        catch (FormatException error)
        {
            throw new InvalidDataException("invalid base64 line: " + label, error);
        }
    }

    private static RunnerSpec ReadSpec()
    {
        string protocol = ReadRequiredLine("protocol");
        if (!String.Equals(protocol, ProtocolId, StringComparison.Ordinal))
        {
            throw new InvalidDataException("unsupported protocol: " + protocol);
        }
        RunnerSpec spec = new RunnerSpec();
        spec.ExecutablePath = DecodeLine("executablePath");
        spec.WorkingDirectory = DecodeLine("workingDirectory");
        spec.EvidencePath = DecodeLine("evidencePath");
        int timeoutMs;
        if (!Int32.TryParse(ReadRequiredLine("timeoutMs"), out timeoutMs) || timeoutMs <= 0)
        {
            throw new InvalidDataException("invalid timeoutMs");
        }
        spec.TimeoutMs = timeoutMs;
        int argumentCount;
        if (!Int32.TryParse(ReadRequiredLine("argumentCount"), out argumentCount) || argumentCount < 0 || argumentCount > 4096)
        {
            throw new InvalidDataException("invalid argumentCount");
        }
        spec.Arguments = new List<string>(argumentCount);
        for (int index = 0; index < argumentCount; index += 1)
        {
            spec.Arguments.Add(DecodeLine("argument-" + index));
        }
        if (String.IsNullOrWhiteSpace(spec.ExecutablePath)) throw new InvalidDataException("executablePath is required");
        if (String.IsNullOrWhiteSpace(spec.WorkingDirectory)) throw new InvalidDataException("workingDirectory is required");
        if (String.IsNullOrWhiteSpace(spec.EvidencePath)) throw new InvalidDataException("evidencePath is required");
        return spec;
    }

    private static string QuoteArgument(string argument)
    {
        argument = argument ?? String.Empty;
        bool needsQuotes = argument.Length == 0;
        for (int index = 0; index < argument.Length && !needsQuotes; index += 1)
        {
            needsQuotes = Char.IsWhiteSpace(argument[index]) || argument[index] == '"';
        }
        if (!needsQuotes) return argument;

        StringBuilder result = new StringBuilder();
        result.Append('"');
        int backslashes = 0;
        foreach (char character in argument)
        {
            if (character == '\\')
            {
                backslashes += 1;
                continue;
            }
            if (character == '"')
            {
                result.Append('\\', backslashes * 2 + 1);
                result.Append('"');
                backslashes = 0;
                continue;
            }
            result.Append('\\', backslashes);
            backslashes = 0;
            result.Append(character);
        }
        result.Append('\\', backslashes * 2);
        result.Append('"');
        return result.ToString();
    }

    private static string BuildCommandLine(RunnerSpec spec)
    {
        StringBuilder commandLine = new StringBuilder(QuoteArgument(spec.ExecutablePath));
        foreach (string argument in spec.Arguments)
        {
            commandLine.Append(' ');
            commandLine.Append(QuoteArgument(argument));
        }
        return commandLine.ToString();
    }

    private static IntPtr DuplicateStandardHandle(int standardHandle)
    {
        IntPtr source = GetStdHandle(standardHandle);
        if (IsInvalidHandle(source)) throw new Win32Exception(Marshal.GetLastWin32Error(), "GetStdHandle failed");
        if (!SetHandleInformation(source, HANDLE_FLAG_INHERIT, 0))
        {
            throw new Win32Exception(Marshal.GetLastWin32Error(), "SetHandleInformation failed");
        }
        IntPtr duplicate;
        IntPtr current = GetCurrentProcess();
        if (!DuplicateHandle(current, source, current, out duplicate, 0, true, DUPLICATE_SAME_ACCESS))
        {
            throw new Win32Exception(Marshal.GetLastWin32Error(), "DuplicateHandle failed");
        }
        return duplicate;
    }

    private static IntPtr CreateNullInputHandle()
    {
        SECURITY_ATTRIBUTES attributes = new SECURITY_ATTRIBUTES();
        attributes.nLength = Marshal.SizeOf(typeof(SECURITY_ATTRIBUTES));
        attributes.bInheritHandle = true;
        IntPtr handle = CreateFileW(
            "NUL",
            GENERIC_READ,
            FILE_SHARE_READ | FILE_SHARE_WRITE,
            ref attributes,
            OPEN_EXISTING,
            FILE_ATTRIBUTE_NORMAL,
            IntPtr.Zero);
        if (IsInvalidHandle(handle)) throw new Win32Exception(Marshal.GetLastWin32Error(), "CreateFileW(NUL) failed");
        return handle;
    }

    private static void InitializeHandleList(
        IntPtr inputHandle,
        IntPtr outputHandle,
        IntPtr errorHandle,
        out IntPtr attributeList,
        out IntPtr handleList)
    {
        attributeList = IntPtr.Zero;
        handleList = IntPtr.Zero;
        bool attributeListInitialized = false;
        try
        {
            IntPtr attributeListSize = IntPtr.Zero;
            InitializeProcThreadAttributeList(IntPtr.Zero, 1, 0, ref attributeListSize);
            if (attributeListSize == IntPtr.Zero)
            {
                throw new Win32Exception(Marshal.GetLastWin32Error(), "InitializeProcThreadAttributeList size query failed");
            }
            attributeList = Marshal.AllocHGlobal(attributeListSize);
            if (!InitializeProcThreadAttributeList(attributeList, 1, 0, ref attributeListSize))
            {
                throw new Win32Exception(Marshal.GetLastWin32Error(), "InitializeProcThreadAttributeList failed");
            }
            attributeListInitialized = true;
            handleList = Marshal.AllocHGlobal(IntPtr.Size * 3);
            Marshal.WriteIntPtr(handleList, 0, inputHandle);
            Marshal.WriteIntPtr(handleList, IntPtr.Size, outputHandle);
            Marshal.WriteIntPtr(handleList, IntPtr.Size * 2, errorHandle);
            if (!UpdateProcThreadAttribute(
                attributeList,
                0,
                PROC_THREAD_ATTRIBUTE_HANDLE_LIST,
                handleList,
                new IntPtr(IntPtr.Size * 3),
                IntPtr.Zero,
                IntPtr.Zero))
            {
                throw new Win32Exception(Marshal.GetLastWin32Error(), "UpdateProcThreadAttribute handle list failed");
            }
        }
        catch
        {
            if (attributeListInitialized) DeleteProcThreadAttributeList(attributeList);
            if (attributeList != IntPtr.Zero) Marshal.FreeHGlobal(attributeList);
            if (handleList != IntPtr.Zero) Marshal.FreeHGlobal(handleList);
            attributeList = IntPtr.Zero;
            handleList = IntPtr.Zero;
            throw;
        }
    }

    private static void FreeHandleList(ref IntPtr attributeList, ref IntPtr handleList)
    {
        if (attributeList != IntPtr.Zero)
        {
            DeleteProcThreadAttributeList(attributeList);
            Marshal.FreeHGlobal(attributeList);
            attributeList = IntPtr.Zero;
        }
        if (handleList != IntPtr.Zero)
        {
            Marshal.FreeHGlobal(handleList);
            handleList = IntPtr.Zero;
        }
    }

    private static void ConfigureJob(IntPtr jobHandle)
    {
        JOBOBJECT_EXTENDED_LIMIT_INFORMATION information = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
        information.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        int size = Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
        IntPtr buffer = Marshal.AllocHGlobal(size);
        try
        {
            Marshal.StructureToPtr(information, buffer, false);
            if (!SetInformationJobObject(jobHandle, JobObjectExtendedLimitInformation, buffer, (uint)size))
            {
                throw new Win32Exception(Marshal.GetLastWin32Error(), "SetInformationJobObject failed");
            }
        }
        finally
        {
            Marshal.FreeHGlobal(buffer);
        }
    }

    private static List<uint> QueryJobProcessIds(IntPtr jobHandle)
    {
        const int bufferSize = 65536;
        IntPtr buffer = Marshal.AllocHGlobal(bufferSize);
        try
        {
            uint returned;
            if (!QueryInformationJobObject(jobHandle, JobObjectBasicProcessIdList, buffer, bufferSize, out returned))
            {
                throw new Win32Exception(Marshal.GetLastWin32Error(), "QueryInformationJobObject failed");
            }
            int count = Marshal.ReadInt32(buffer, 4);
            List<uint> processIds = new List<uint>(count);
            int offset = 8;
            for (int index = 0; index < count; index += 1)
            {
                long value = IntPtr.Size == 8
                    ? Marshal.ReadInt64(buffer, offset + index * IntPtr.Size)
                    : Marshal.ReadInt32(buffer, offset + index * IntPtr.Size);
                if (value > 0 && value <= UInt32.MaxValue) processIds.Add((uint)value);
            }
            return processIds;
        }
        finally
        {
            Marshal.FreeHGlobal(buffer);
        }
    }

    private static Dictionary<uint, IntPtr> CaptureProcessHandles(
        IEnumerable<uint> processIds,
        uint rootPid,
        List<uint> unverifiedPids)
    {
        Dictionary<uint, IntPtr> handles = new Dictionary<uint, IntPtr>();
        foreach (uint processId in processIds)
        {
            if (processId == rootPid || handles.ContainsKey(processId)) continue;
            IntPtr processHandle = OpenProcess(SYNCHRONIZE, false, processId);
            if (IsInvalidHandle(processHandle))
            {
                int openError = Marshal.GetLastWin32Error();
                if (openError != ERROR_INVALID_PARAMETER) unverifiedPids.Add(processId);
                continue;
            }
            handles.Add(processId, processHandle);
        }
        return handles;
    }

    private static List<uint> WaitForCapturedProcesses(
        Dictionary<uint, IntPtr> handles,
        List<uint> unverifiedPids)
    {
        List<uint> remaining = new List<uint>();
        foreach (KeyValuePair<uint, IntPtr> entry in handles)
        {
            uint waitResult = WaitForSingleObject(entry.Value, 5000);
            if (waitResult != WAIT_OBJECT_0) remaining.Add(entry.Key);
            if (!CloseHandle(entry.Value))
            {
                if (!unverifiedPids.Contains(entry.Key)) unverifiedPids.Add(entry.Key);
            }
        }
        handles.Clear();
        return remaining;
    }

    private static bool CloseJobHandle(ref IntPtr jobHandle)
    {
        if (IsInvalidHandle(jobHandle)) return false;
        bool closed = CloseHandle(jobHandle);
        jobHandle = IntPtr.Zero;
        return closed;
    }

    private static string JsonEscape(string value)
    {
        if (value == null) return "";
        StringBuilder result = new StringBuilder();
        foreach (char character in value)
        {
            switch (character)
            {
                case '\\': result.Append("\\\\"); break;
                case '"': result.Append("\\\""); break;
                case '\r': result.Append("\\r"); break;
                case '\n': result.Append("\\n"); break;
                case '\t': result.Append("\\t"); break;
                default:
                    if (character < 32) result.Append("\\u" + ((int)character).ToString("x4"));
                    else result.Append(character);
                    break;
            }
        }
        return result.ToString();
    }

    private static string JsonArray(IEnumerable<uint> values)
    {
        return "[" + String.Join(",", new List<uint>(values).ConvertAll(delegate(uint value) { return value.ToString(); }).ToArray()) + "]";
    }

    private static string JsonStringArray(IEnumerable<string> values)
    {
        return "[" + String.Join(",", new List<string>(values).ConvertAll(delegate(string value) {
            return "\"" + JsonEscape(value) + "\"";
        }).ToArray()) + "]";
    }

    private static void WriteEvidence(
        RunnerSpec spec,
        string status,
        uint rootPid,
        int rootExitCode,
        bool timedOut,
        bool assignedBeforeResume,
        bool rootInJobBeforeResume,
        bool suspendedRootTerminatedOnAssignFailure,
        bool jobCloseSucceeded,
        bool terminateJobSucceeded,
        bool rootTerminationConfirmed,
        bool cleanupValid,
        List<uint> jobProcessIdsAtRootExit,
        List<uint> remainingPids,
        List<uint> unverifiedPids,
        string error)
    {
        string evidencePath = spec == null ? null : spec.EvidencePath;
        if (String.IsNullOrWhiteSpace(evidencePath)) return;
        string directory = Path.GetDirectoryName(evidencePath);
        if (!String.IsNullOrWhiteSpace(directory)) Directory.CreateDirectory(directory);
        string json = "{" +
            "\"schemaVersion\":1," +
            "\"protocolId\":\"" + ProtocolId + "\"," +
            "\"provider\":\"windows-job-object\"," +
            "\"status\":\"" + JsonEscape(status) + "\"," +
            "\"rootPid\":" + rootPid + "," +
            "\"rootExitCode\":" + rootExitCode + "," +
            "\"timedOut\":" + timedOut.ToString().ToLowerInvariant() + "," +
            "\"createSuspended\":true," +
            "\"createNoWindow\":true," +
            "\"assignedBeforeResume\":" + assignedBeforeResume.ToString().ToLowerInvariant() + "," +
            "\"rootInJobBeforeResume\":" + rootInJobBeforeResume.ToString().ToLowerInvariant() + "," +
            "\"killOnJobClose\":true," +
            "\"breakawayAllowed\":false," +
            "\"suspendedRootTerminatedOnAssignFailure\":" + suspendedRootTerminatedOnAssignFailure.ToString().ToLowerInvariant() + "," +
            "\"jobCloseSucceeded\":" + jobCloseSucceeded.ToString().ToLowerInvariant() + "," +
            "\"terminateJobSucceeded\":" + terminateJobSucceeded.ToString().ToLowerInvariant() + "," +
            "\"rootTerminationConfirmed\":" + rootTerminationConfirmed.ToString().ToLowerInvariant() + "," +
            "\"jobProcessIdsAtRootExit\":" + JsonArray(jobProcessIdsAtRootExit) + "," +
            "\"remainingPids\":" + JsonArray(remainingPids) + "," +
            "\"unverifiedPids\":" + JsonArray(unverifiedPids) + "," +
            "\"cleanupValid\":" + cleanupValid.ToString().ToLowerInvariant() + "," +
            "\"commandExecutablePath\":\"" + JsonEscape(spec.ExecutablePath) + "\"," +
            "\"commandWorkingDirectory\":\"" + JsonEscape(spec.WorkingDirectory) + "\"," +
            "\"commandArguments\":" + JsonStringArray(spec.Arguments) + "," +
            "\"error\":" + (error == null ? "null" : "\"" + JsonEscape(error) + "\"") +
            "}";
        File.WriteAllText(evidencePath, json + Environment.NewLine, new UTF8Encoding(false));
    }

    public static int Main()
    {
        RunnerSpec spec = null;
        IntPtr jobHandle = IntPtr.Zero;
        IntPtr processHandle = IntPtr.Zero;
        IntPtr threadHandle = IntPtr.Zero;
        IntPtr inputHandle = IntPtr.Zero;
        IntPtr outputHandle = IntPtr.Zero;
        IntPtr errorHandle = IntPtr.Zero;
        IntPtr attributeList = IntPtr.Zero;
        IntPtr handleList = IntPtr.Zero;
        uint rootPid = 0;
        int rootExitCode = 3;
        bool timedOut = false;
        bool assignedBeforeResume = false;
        bool rootInJobBeforeResume = false;
        bool suspendedRootTerminatedOnAssignFailure = false;
        bool jobCloseSucceeded = false;
        bool terminateJobSucceeded = false;
        bool rootTerminationConfirmed = false;
        bool cleanupValid = false;
        List<uint> jobProcessIdsAtRootExit = new List<uint>();
        List<uint> remainingPids = new List<uint>();
        List<uint> unverifiedPids = new List<uint>();
        Dictionary<uint, IntPtr> verificationHandles = new Dictionary<uint, IntPtr>();
        string status = "invalid";
        string errorMessage = null;

        try
        {
            spec = ReadSpec();
            jobHandle = CreateJobObject(IntPtr.Zero, null);
            if (IsInvalidHandle(jobHandle)) throw new Win32Exception(Marshal.GetLastWin32Error(), "CreateJobObject failed");
            ConfigureJob(jobHandle);

                inputHandle = CreateNullInputHandle();
                outputHandle = DuplicateStandardHandle(STD_OUTPUT_HANDLE);
                errorHandle = DuplicateStandardHandle(STD_ERROR_HANDLE);
                InitializeHandleList(inputHandle, outputHandle, errorHandle, out attributeList, out handleList);
                STARTUPINFOEX startup = new STARTUPINFOEX();
                startup.StartupInfo.cb = Marshal.SizeOf(typeof(STARTUPINFOEX));
                startup.StartupInfo.dwFlags = (int)STARTF_USESTDHANDLES;
                startup.StartupInfo.hStdInput = inputHandle;
                startup.StartupInfo.hStdOutput = outputHandle;
                startup.StartupInfo.hStdError = errorHandle;
                startup.lpAttributeList = attributeList;
                PROCESS_INFORMATION processInformation;
                StringBuilder commandLine = new StringBuilder(BuildCommandLine(spec));
                bool created = CreateProcessW(
                spec.ExecutablePath,
                commandLine,
                    IntPtr.Zero,
                    IntPtr.Zero,
                    true,
                    CREATE_SUSPENDED | CREATE_NO_WINDOW | EXTENDED_STARTUPINFO_PRESENT,
                    IntPtr.Zero,
                    spec.WorkingDirectory,
                    ref startup,
                    out processInformation);
                int createError = created ? 0 : Marshal.GetLastWin32Error();
                FreeHandleList(ref attributeList, ref handleList);
                CloseIfValid(ref inputHandle);
                CloseIfValid(ref outputHandle);
                CloseIfValid(ref errorHandle);
                if (!created) throw new Win32Exception(createError, "CreateProcessW failed");

                processHandle = processInformation.hProcess;
                threadHandle = processInformation.hThread;
                rootPid = processInformation.dwProcessId;
                if (!AssignProcessToJobObject(jobHandle, processHandle))
                {
                    int assignError = Marshal.GetLastWin32Error();
                    bool terminated = TerminateProcess(processHandle, 3);
                    uint terminationWait = terminated ? WaitForSingleObject(processHandle, 5000) : WAIT_TIMEOUT;
                    suspendedRootTerminatedOnAssignFailure = terminated && terminationWait == WAIT_OBJECT_0;
                    rootTerminationConfirmed = suspendedRootTerminatedOnAssignFailure;
                    throw new Win32Exception(assignError, "AssignProcessToJobObject failed");
                }
                assignedBeforeResume = true;
                if (!IsProcessInJob(processHandle, jobHandle, out rootInJobBeforeResume))
                {
                    throw new Win32Exception(Marshal.GetLastWin32Error(), "IsProcessInJob failed");
                }
                if (!rootInJobBeforeResume) throw new InvalidOperationException("assigned root is not in the Job before resume");
                if (ResumeThread(threadHandle) == UInt32.MaxValue)
                {
                    throw new Win32Exception(Marshal.GetLastWin32Error(), "ResumeThread failed");
            }

            uint waitResult = WaitForSingleObject(processHandle, (uint)spec.TimeoutMs);
                if (waitResult == WAIT_TIMEOUT)
                {
                    timedOut = true;
                    jobProcessIdsAtRootExit = QueryJobProcessIds(jobHandle);
                    if (!jobProcessIdsAtRootExit.Contains(rootPid)) jobProcessIdsAtRootExit.Add(rootPid);
                    verificationHandles = CaptureProcessHandles(jobProcessIdsAtRootExit, rootPid, unverifiedPids);
                    terminateJobSucceeded = TerminateJobObject(jobHandle, 124);
                    if (!terminateJobSucceeded) throw new Win32Exception(Marshal.GetLastWin32Error(), "TerminateJobObject timeout cleanup failed");
                    jobCloseSucceeded = CloseJobHandle(ref jobHandle);
                    if (!jobCloseSucceeded) throw new Win32Exception(Marshal.GetLastWin32Error(), "CloseHandle(Job) failed");
                    rootTerminationConfirmed = WaitForSingleObject(processHandle, 5000) == WAIT_OBJECT_0;
                    if (!rootTerminationConfirmed) throw new InvalidOperationException("timed-out root process did not terminate");
                }
                else if (waitResult != WAIT_OBJECT_0)
                {
                    throw new Win32Exception(Marshal.GetLastWin32Error(), "WaitForSingleObject failed");
                }
                else
                {
                    rootTerminationConfirmed = true;
                    jobProcessIdsAtRootExit = QueryJobProcessIds(jobHandle);
                    if (!jobProcessIdsAtRootExit.Contains(rootPid)) jobProcessIdsAtRootExit.Add(rootPid);
                    verificationHandles = CaptureProcessHandles(jobProcessIdsAtRootExit, rootPid, unverifiedPids);
                    jobCloseSucceeded = CloseJobHandle(ref jobHandle);
                    if (!jobCloseSucceeded) throw new Win32Exception(Marshal.GetLastWin32Error(), "CloseHandle(Job) failed");
                }
                uint nativeExitCode;
                if (!GetExitCodeProcess(processHandle, out nativeExitCode)) throw new Win32Exception(Marshal.GetLastWin32Error(), "GetExitCodeProcess failed");
                rootExitCode = unchecked((int)nativeExitCode);
                remainingPids = WaitForCapturedProcesses(verificationHandles, unverifiedPids);
                cleanupValid = jobCloseSucceeded
                    && rootTerminationConfirmed
                    && (!timedOut || terminateJobSucceeded)
                    && remainingPids.Count == 0
                    && unverifiedPids.Count == 0;
                status = cleanupValid ? "complete" : "invalid";
            }
            catch (Exception error)
            {
                errorMessage = error.ToString();
                Console.Error.WriteLine(errorMessage);
                if (assignedBeforeResume && !IsInvalidHandle(jobHandle))
                {
                    try
                    {
                        if (jobProcessIdsAtRootExit.Count == 0) jobProcessIdsAtRootExit = QueryJobProcessIds(jobHandle);
                    }
                    catch (Exception queryError)
                    {
                        errorMessage += Environment.NewLine + queryError.ToString();
                        if (rootPid > 0 && !unverifiedPids.Contains(rootPid)) unverifiedPids.Add(rootPid);
                    }
                    if (rootPid > 0 && !jobProcessIdsAtRootExit.Contains(rootPid)) jobProcessIdsAtRootExit.Add(rootPid);
                    if (verificationHandles.Count == 0)
                    {
                        verificationHandles = CaptureProcessHandles(jobProcessIdsAtRootExit, rootPid, unverifiedPids);
                    }
                    terminateJobSucceeded = TerminateJobObject(jobHandle, 3);
                    jobCloseSucceeded = CloseJobHandle(ref jobHandle);
                    if (!IsInvalidHandle(processHandle))
                    {
                        rootTerminationConfirmed = WaitForSingleObject(processHandle, 5000) == WAIT_OBJECT_0;
                    }
                }
                else
                {
                    if (!IsInvalidHandle(processHandle) && !rootTerminationConfirmed)
                    {
                        bool terminated = TerminateProcess(processHandle, 3);
                        rootTerminationConfirmed = terminated && WaitForSingleObject(processHandle, 5000) == WAIT_OBJECT_0;
                        suspendedRootTerminatedOnAssignFailure = rootTerminationConfirmed;
                    }
                    if (!IsInvalidHandle(jobHandle)) jobCloseSucceeded = CloseJobHandle(ref jobHandle);
                }
                if (verificationHandles.Count > 0)
                {
                    remainingPids = WaitForCapturedProcesses(verificationHandles, unverifiedPids);
                }
                cleanupValid = false;
            }
            finally
            {
                FreeHandleList(ref attributeList, ref handleList);
                CloseIfValid(ref inputHandle);
                CloseIfValid(ref outputHandle);
                CloseIfValid(ref errorHandle);
                CloseIfValid(ref threadHandle);
                CloseIfValid(ref processHandle);
                if (!IsInvalidHandle(jobHandle)) jobCloseSucceeded = CloseJobHandle(ref jobHandle);
                try
                {
                WriteEvidence(
                    spec,
                    status,
                    rootPid,
                    rootExitCode,
                    timedOut,
                        assignedBeforeResume,
                        rootInJobBeforeResume,
                        suspendedRootTerminatedOnAssignFailure,
                        jobCloseSucceeded,
                        terminateJobSucceeded,
                        rootTerminationConfirmed,
                        cleanupValid,
                        jobProcessIdsAtRootExit,
                        remainingPids,
                        unverifiedPids,
                        errorMessage);
            }
            catch (Exception evidenceError)
            {
                Console.Error.WriteLine(evidenceError.ToString());
                status = "invalid";
            }
        }
        return String.Equals(status, "complete", StringComparison.Ordinal) ? 0 : 3;
    }
}
