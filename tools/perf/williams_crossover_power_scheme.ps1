# Williams crossover power-scheme identity lifecycle.
# This file is dot-sourced by the governed Windows operator. It also exposes
# deterministic self-test and explicit live-preflight entry points.

[CmdletBinding()]
param(
  [switch]$SelfTest,
  [switch]$LivePreflight
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false

$script:WilliamsPowerGuidPattern = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'

function Get-WilliamsPowerSchemeGuid {
  param([Parameter(Mandatory = $true)][string]$Text)

  $match = [regex]::Match($Text, $script:WilliamsPowerGuidPattern)
  if (-not $match.Success) {
    throw 'powercfg output did not contain a scheme GUID'
  }
  return $match.Value.ToLowerInvariant()
}

function New-WilliamsPowerCfgRunner {
  return {
    param([string[]]$Arguments)
    $previousPreference = $ErrorActionPreference
    try {
      $ErrorActionPreference = 'Continue'
      $output = (& powercfg.exe @Arguments 2>&1 | Out-String).Trim()
      $exitCode = $LASTEXITCODE
    } finally {
      $ErrorActionPreference = $previousPreference
    }
    return [pscustomobject]@{
      exitCode = $exitCode
      output = $output
    }
  }
}

function Invoke-WilliamsPowerCfgTracked {
  param(
    [Parameter(Mandatory = $true)][string]$Action,
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][System.Collections.Generic.List[object]]$EventSink,
    [Parameter(Mandatory = $true)][scriptblock]$Runner,
    [ValidateSet('success', 'failure')][string]$ExpectedOutcome = 'success'
  )

  $startedAt = [DateTime]::UtcNow.ToString('o')
  $result = & $Runner $Arguments
  if ($null -eq $result -or $null -eq $result.exitCode) {
    throw "powercfg runner returned an invalid result for $Action"
  }
  $event = [ordered]@{
    action = $Action
    arguments = @($Arguments)
    startedAt = $startedAt
    completedAt = [DateTime]::UtcNow.ToString('o')
    exitCode = [int]$result.exitCode
    expectedOutcome = $ExpectedOutcome
    output = [string]$result.output
  }
  $EventSink.Add($event)

  if ($ExpectedOutcome -eq 'success' -and $event.exitCode -ne 0) {
    throw "powercfg $Action failed with exit $($event.exitCode): $($event.output)"
  }
  if ($ExpectedOutcome -eq 'failure' -and $event.exitCode -eq 0) {
    throw "powercfg $Action unexpectedly succeeded"
  }
  return $event
}

function Start-WilliamsTemporaryPowerScheme {
  param(
    [Parameter(Mandatory = $true)][ref]$SessionOut,
    [scriptblock]$Runner = (New-WilliamsPowerCfgRunner),
    [string]$DestinationGuid = ([guid]::NewGuid().ToString().ToLowerInvariant())
  )

  $events = [System.Collections.Generic.List[object]]::new()
  $session = [ordered]@{
    schemaVersion = 1
    status = 'starting'
    originalGuid = $null
    temporaryGuid = $DestinationGuid.ToLowerInvariant()
    capabilities = $null
    events = $events
  }
  $SessionOut.Value = $session

  $capabilities = Invoke-WilliamsPowerCfgTracked -Action 'capabilities' -Arguments @('/a') -EventSink $events -Runner $Runner
  $session.capabilities = $capabilities.output

  $original = Invoke-WilliamsPowerCfgTracked -Action 'original-active' -Arguments @('/getactivescheme') -EventSink $events -Runner $Runner
  $session.originalGuid = Get-WilliamsPowerSchemeGuid -Text $original.output
  if ($session.originalGuid -eq $session.temporaryGuid) {
    throw 'temporary power-scheme GUID equals the original active GUID'
  }

  $duplicate = Invoke-WilliamsPowerCfgTracked -Action 'duplicate' -Arguments @('/duplicatescheme', 'SCHEME_MIN', $session.temporaryGuid) -EventSink $events -Runner $Runner
  $returnedGuid = Get-WilliamsPowerSchemeGuid -Text $duplicate.output
  if ($returnedGuid -ne $session.temporaryGuid) {
    throw "duplicate GUID mismatch: expected $($session.temporaryGuid), got $returnedGuid"
  }

  [void](Invoke-WilliamsPowerCfgTracked -Action 'query-created' -Arguments @('/query', $session.temporaryGuid) -EventSink $events -Runner $Runner)
  [void](Invoke-WilliamsPowerCfgTracked -Action 'activate' -Arguments @('/setactive', $session.temporaryGuid) -EventSink $events -Runner $Runner)
  $active = Invoke-WilliamsPowerCfgTracked -Action 'temporary-active' -Arguments @('/getactivescheme') -EventSink $events -Runner $Runner
  $activeGuid = Get-WilliamsPowerSchemeGuid -Text $active.output
  if ($activeGuid -ne $session.temporaryGuid) {
    throw "temporary GUID did not become active: $activeGuid"
  }

  $session.status = 'active'
  return $session
}

function Stop-WilliamsTemporaryPowerScheme {
  param(
    [Parameter(Mandatory = $true)]$Session,
    [scriptblock]$Runner = (New-WilliamsPowerCfgRunner)
  )

  if (-not $Session.originalGuid -or -not $Session.temporaryGuid) {
    throw 'power-scheme cleanup requires original and temporary GUIDs'
  }

  $events = $Session.events
  [void](Invoke-WilliamsPowerCfgTracked -Action 'restore' -Arguments @('/setactive', $Session.originalGuid) -EventSink $events -Runner $Runner)
  $restored = Invoke-WilliamsPowerCfgTracked -Action 'restored-active' -Arguments @('/getactivescheme') -EventSink $events -Runner $Runner
  $restoredGuid = Get-WilliamsPowerSchemeGuid -Text $restored.output
  if ($restoredGuid -ne $Session.originalGuid) {
    throw "original GUID was not restored: $restoredGuid"
  }

  [void](Invoke-WilliamsPowerCfgTracked -Action 'delete-temporary' -Arguments @('/delete', $Session.temporaryGuid) -EventSink $events -Runner $Runner)
  $deletedQuery = Invoke-WilliamsPowerCfgTracked -Action 'query-deleted' -Arguments @('/query', $Session.temporaryGuid) -EventSink $events -Runner $Runner -ExpectedOutcome 'failure'
  [void](Invoke-WilliamsPowerCfgTracked -Action 'query-original-after-delete' -Arguments @('/query', $Session.originalGuid) -EventSink $events -Runner $Runner)

  $Session.status = 'cleaned'
  $Session.cleanup = [ordered]@{
    valid = $true
    restoredGuid = $restoredGuid
    temporaryGuidAbsent = $true
    absenceClassification = 'scheme-absent'
    deletedQueryExitCode = $deletedQuery.exitCode
  }
  return $Session.cleanup
}

function Invoke-WilliamsPowerSchemeSelfTest {
  $originalGuid = '381b4222-f694-41f0-9685-ff5bb260df2e'
  $temporaryGuid = '11111111-2222-4333-8444-555555555555'
  $state = @{ activeGuid = $originalGuid; deleted = $false }
  $runner = {
    param([string[]]$Arguments)
    $command = $Arguments -join ' '
    switch -Regex ($command) {
      '^/a$' { return [pscustomobject]@{ exitCode = 0; output = 'Standby (S0 Low Power Idle) Network Connected' } }
      '^/getactivescheme$' { return [pscustomobject]@{ exitCode = 0; output = "Power Scheme GUID: $($state.activeGuid)" } }
      '^/duplicatescheme SCHEME_MIN ' { return [pscustomobject]@{ exitCode = 0; output = "Power Scheme GUID: $temporaryGuid" } }
      "^/query $temporaryGuid$" {
        if ($state.deleted) { return [pscustomobject]@{ exitCode = 1; output = 'The power scheme does not exist.' } }
        return [pscustomobject]@{ exitCode = 0; output = "Power Scheme GUID: $temporaryGuid" }
      }
      "^/query $originalGuid$" { return [pscustomobject]@{ exitCode = 0; output = "Power Scheme GUID: $originalGuid" } }
      "^/setactive $temporaryGuid$" { $state.activeGuid = $temporaryGuid; return [pscustomobject]@{ exitCode = 0; output = '' } }
      "^/setactive $originalGuid$" { $state.activeGuid = $originalGuid; return [pscustomobject]@{ exitCode = 0; output = '' } }
      "^/delete $temporaryGuid$" { $state.deleted = $true; return [pscustomobject]@{ exitCode = 0; output = '' } }
      default { throw "unexpected self-test command: $command" }
    }
  }

  $sessionRef = [ref]$null
  $session = Start-WilliamsTemporaryPowerScheme -SessionOut $sessionRef -Runner $runner -DestinationGuid $temporaryGuid
  $cleanup = Stop-WilliamsTemporaryPowerScheme -Session $session -Runner $runner
  return [ordered]@{
    lifecycleSucceeded = ($session.status -eq 'cleaned')
    cleanupValid = $cleanup.valid
    originalGuid = $session.originalGuid
    temporaryGuid = $session.temporaryGuid
    commandSequence = @($session.events | ForEach-Object { $_.action })
    queryDeletedExitCode = $cleanup.deletedQueryExitCode
    absenceClassification = $cleanup.absenceClassification
    events = $session.events
  }
}

function Invoke-WilliamsPowerSchemeLivePreflight {
  $sessionRef = [ref]$null
  $session = $null
  $failure = $null
  $cleanup = $null
  try {
    $session = Start-WilliamsTemporaryPowerScheme -SessionOut $sessionRef
  } catch {
    $failure = $_.Exception.Message
    $session = $sessionRef.Value
  } finally {
    if ($session -and $session.originalGuid -and $session.temporaryGuid) {
      try {
        $cleanup = Stop-WilliamsTemporaryPowerScheme -Session $session
      } catch {
        if (-not $failure) { $failure = $_.Exception.Message }
      }
    }
  }

  $result = [ordered]@{
    schemaVersion = 1
    lifecycleSucceeded = ($null -eq $failure -and $session.status -eq 'cleaned')
    cleanupValid = ($cleanup -and $cleanup.valid)
    failure = $failure
    originalGuid = if ($session) { $session.originalGuid } else { $null }
    temporaryGuid = if ($session) { $session.temporaryGuid } else { $null }
    cleanup = $cleanup
    events = if ($session) { $session.events } else { @() }
  }
  return $result
}

if ($SelfTest) {
  $result = Invoke-WilliamsPowerSchemeSelfTest
  $result | ConvertTo-Json -Depth 8
  if (-not $result.lifecycleSucceeded -or -not $result.cleanupValid) { exit 1 }
  exit 0
}

if ($LivePreflight) {
  $result = Invoke-WilliamsPowerSchemeLivePreflight
  $result | ConvertTo-Json -Depth 8
  if (-not $result.lifecycleSucceeded -or -not $result.cleanupValid) { exit 1 }
  exit 0
}

if ($MyInvocation.InvocationName -ne '.') {
  throw 'Use -SelfTest, -LivePreflight, or dot-source this file from the governed operator.'
}
