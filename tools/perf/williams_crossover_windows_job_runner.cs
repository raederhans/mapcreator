internal static class ScenarioForgeWilliamsJobRunner
{
    private const string ProtocolId = "SF_WILLIAMS_JOB_V1";

    public static int Main()
    {
        return ScenarioForgeWindowsJobRunnerCore.Run(ProtocolId);
    }
}
