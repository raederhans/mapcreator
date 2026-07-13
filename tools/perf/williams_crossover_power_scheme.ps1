# Williams crossover power-scheme identity lifecycle.
# This file is dot-sourced by the governed Windows operator. It also exposes
# deterministic self-test and explicit live-preflight entry points.

[CmdletBinding()]
param(
  [switch]$SelfTest,
  [switch]$LivePreflight,
  [switch]$StartSession,
  [switch]$StopSession,
  [string]$SessionPath,
  [string]$DestinationGuid
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

function ConvertTo-WilliamsCanonicalSessionGuid {
  param(
    [AllowNull()]$Value,
    [Parameter(Mandatory = $true)][string]$Label,
    [switch]$AllowEmpty
  )

  $text = [string]$Value
  if ([string]::IsNullOrWhiteSpace($text)) {
    if ($AllowEmpty) { return $null }
    throw "$Label must be a GUID"
  }
  if ($text -notmatch "^$($script:WilliamsPowerGuidPattern)$") {
    throw "$Label must be a canonical GUID"
  }
  return ([guid]$text).ToString('D').ToLowerInvariant()
}

function Assert-WilliamsPowerSchemeSessionSafety {
  param([Parameter(Mandatory = $true)]$Session)

  if ([int]$Session.schemaVersion -ne 1) {
    throw "unsupported power-scheme session schema: $($Session.schemaVersion)"
  }
  $temporaryGuid = ConvertTo-WilliamsCanonicalSessionGuid -Value $Session.temporaryGuid -Label 'temporaryGuid'
  $originalGuid = ConvertTo-WilliamsCanonicalSessionGuid -Value $Session.originalGuid -Label 'originalGuid' -AllowEmpty
  $createdGuid = ConvertTo-WilliamsCanonicalSessionGuid -Value $Session.createdGuid -Label 'createdGuid' -AllowEmpty
  $declaresMutation = (
    $Session.duplicateStarted -eq $true `
    -or $Session.destinationWasAbsent -eq $true `
    -or -not [string]::IsNullOrWhiteSpace([string]$createdGuid)
  )
  if ($originalGuid -and $originalGuid -eq $temporaryGuid -and $declaresMutation) {
    throw 'mutated power-scheme session originalGuid equals temporaryGuid'
  }
  if ($createdGuid -and $createdGuid -ne $temporaryGuid) {
    throw 'power-scheme session createdGuid does not match temporaryGuid'
  }
  $ownershipConfirmed = ($Session.destinationWasAbsent -eq $true -and $Session.duplicateStarted -eq $true)
  if ($createdGuid -and -not $ownershipConfirmed) {
    throw 'power-scheme session createdGuid lacks destination ownership proof'
  }
  if ($Session.duplicateStarted -eq $true -and $Session.destinationWasAbsent -ne $true) {
    throw 'power-scheme session duplicateStarted lacks destination absence proof'
  }

  $Session.temporaryGuid = $temporaryGuid
  $Session.originalGuid = $originalGuid
  $Session.createdGuid = $createdGuid
  return [ordered]@{
    temporaryGuid = $temporaryGuid
    originalGuid = $originalGuid
    createdGuid = $createdGuid
    ownershipConfirmed = $ownershipConfirmed
  }
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
    [ValidateSet('success', 'failure', 'any')][string]$ExpectedOutcome = 'success'
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

function Invoke-WilliamsPowerSchemeCheckpoint {
  param(
    [Parameter(Mandatory = $true)]$Session,
    [scriptblock]$Checkpoint
  )

  if ($Checkpoint) { & $Checkpoint $Session }
}

function Get-WilliamsPowerSchemeAbsenceClassification {
  param(
    [Parameter(Mandatory = $true)]$QueryResult,
    [Parameter(Mandatory = $true)]$ControlQueryResult,
    [Parameter(Mandatory = $true)][string]$ExpectedControlGuid,
    [Parameter(Mandatory = $true)][string]$DeletedGuid
  )

  if ([int]$QueryResult.exitCode -eq 0) { return 'query-succeeded' }
  if ([int]$ControlQueryResult.exitCode -ne 0) { return 'control-query-failed' }
  try {
    $controlGuid = Get-WilliamsPowerSchemeGuid -Text ([string]$ControlQueryResult.output)
  } catch {
    return 'control-query-invalid'
  }
  if ($controlGuid -ne $ExpectedControlGuid.ToLowerInvariant()) { return 'control-identity-mismatch' }
  if ([string]$QueryResult.output -match [regex]::Escape($DeletedGuid)) { return 'query-failure-target-referenced' }
  if ([int]$QueryResult.exitCode -eq 1) { return 'scheme-absent' }
  return 'query-failure-unclassified'
}

function Start-WilliamsTemporaryPowerScheme {
  param(
    [Parameter(Mandatory = $true)][ref]$SessionOut,
    [scriptblock]$Runner = (New-WilliamsPowerCfgRunner),
    [string]$DestinationGuid = ([guid]::NewGuid().ToString().ToLowerInvariant()),
    [scriptblock]$Checkpoint
  )

  $canonicalDestinationGuid = ConvertTo-WilliamsCanonicalSessionGuid -Value $DestinationGuid -Label 'DestinationGuid'
  $events = [System.Collections.Generic.List[object]]::new()
  $session = [ordered]@{
    schemaVersion = 1
    status = 'starting'
    phase = 'initializing'
    originalGuid = $null
    temporaryGuid = $canonicalDestinationGuid
    createdGuid = $null
    duplicateReturnedGuid = $null
    destinationWasAbsent = $null
    destinationAbsenceClassification = $null
    duplicateStarted = $false
    originalExpectedPowerSchemeGuidEnv = [Environment]::GetEnvironmentVariable('WILLIAMS_EXPECTED_POWER_SCHEME_GUID', 'Process')
    capabilities = $null
    events = $events
  }
  $SessionOut.Value = $session
  Invoke-WilliamsPowerSchemeCheckpoint -Session $session -Checkpoint $Checkpoint

  $capabilities = Invoke-WilliamsPowerCfgTracked -Action 'capabilities' -Arguments @('/a') -EventSink $events -Runner $Runner
  $session.capabilities = $capabilities.output
  Invoke-WilliamsPowerSchemeCheckpoint -Session $session -Checkpoint $Checkpoint

  $original = Invoke-WilliamsPowerCfgTracked -Action 'original-active' -Arguments @('/getactivescheme') -EventSink $events -Runner $Runner
  $session.originalGuid = Get-WilliamsPowerSchemeGuid -Text $original.output
  if ($session.originalGuid -eq $session.temporaryGuid) {
    $session.destinationWasAbsent = $false
    $session.destinationAbsenceClassification = 'original-active'
    $session.phase = 'destination-conflict'
    Invoke-WilliamsPowerSchemeCheckpoint -Session $session -Checkpoint $Checkpoint
    throw 'temporary power-scheme GUID equals the original active GUID'
  }
  Invoke-WilliamsPowerSchemeCheckpoint -Session $session -Checkpoint $Checkpoint

  $destinationQuery = Invoke-WilliamsPowerCfgTracked -Action 'query-destination-before-duplicate' -Arguments @('/query', $session.temporaryGuid) -EventSink $events -Runner $Runner -ExpectedOutcome 'any'
  $controlQuery = Invoke-WilliamsPowerCfgTracked -Action 'query-original-before-duplicate' -Arguments @('/query', $session.originalGuid) -EventSink $events -Runner $Runner
  $destinationAbsenceClassification = Get-WilliamsPowerSchemeAbsenceClassification `
    -QueryResult $destinationQuery `
    -ControlQueryResult $controlQuery `
    -ExpectedControlGuid $session.originalGuid `
    -DeletedGuid $session.temporaryGuid
  $session.destinationAbsenceClassification = $destinationAbsenceClassification
  $session.destinationWasAbsent = ($destinationAbsenceClassification -eq 'scheme-absent')
  if (-not $session.destinationWasAbsent) {
    $session.phase = if ($destinationAbsenceClassification -eq 'query-succeeded') { 'destination-conflict' } else { 'destination-check-failed' }
    Invoke-WilliamsPowerSchemeCheckpoint -Session $session -Checkpoint $Checkpoint
    throw "temporary power-scheme destination is unavailable: $destinationAbsenceClassification"
  }

  $session.duplicateStarted = $true
  $session.phase = 'duplicate-pending'
  Invoke-WilliamsPowerSchemeCheckpoint -Session $session -Checkpoint $Checkpoint
  $duplicate = Invoke-WilliamsPowerCfgTracked -Action 'duplicate' -Arguments @('/duplicatescheme', 'SCHEME_MIN', $session.temporaryGuid) -EventSink $events -Runner $Runner
  $returnedGuid = Get-WilliamsPowerSchemeGuid -Text $duplicate.output
  $session.duplicateReturnedGuid = $returnedGuid
  $session.phase = 'duplicate-returned'
  Invoke-WilliamsPowerSchemeCheckpoint -Session $session -Checkpoint $Checkpoint
  if ($returnedGuid -ne $session.temporaryGuid) {
    $session.phase = 'duplicate-guid-mismatch'
    Invoke-WilliamsPowerSchemeCheckpoint -Session $session -Checkpoint $Checkpoint
    throw "duplicate GUID mismatch: expected $($session.temporaryGuid), got $returnedGuid"
  }
  $session.createdGuid = $returnedGuid
  $session.phase = 'created'
  Invoke-WilliamsPowerSchemeCheckpoint -Session $session -Checkpoint $Checkpoint

  [void](Invoke-WilliamsPowerCfgTracked -Action 'query-created' -Arguments @('/query', $session.temporaryGuid) -EventSink $events -Runner $Runner)
  [void](Invoke-WilliamsPowerCfgTracked -Action 'activate' -Arguments @('/setactive', $session.temporaryGuid) -EventSink $events -Runner $Runner)
  Invoke-WilliamsPowerSchemeCheckpoint -Session $session -Checkpoint $Checkpoint
  $active = Invoke-WilliamsPowerCfgTracked -Action 'temporary-active' -Arguments @('/getactivescheme') -EventSink $events -Runner $Runner
  $activeGuid = Get-WilliamsPowerSchemeGuid -Text $active.output
  if ($activeGuid -ne $session.temporaryGuid) {
    throw "temporary GUID did not become active: $activeGuid"
  }

  [Environment]::SetEnvironmentVariable('WILLIAMS_EXPECTED_POWER_SCHEME_GUID', $session.temporaryGuid, 'Process')
  $session.status = 'active'
  $session.phase = 'active'
  Invoke-WilliamsPowerSchemeCheckpoint -Session $session -Checkpoint $Checkpoint
  return $session
}

function Stop-WilliamsTemporaryPowerScheme {
  param(
    [Parameter(Mandatory = $true)]$Session,
    [scriptblock]$Runner = (New-WilliamsPowerCfgRunner),
    [scriptblock]$Checkpoint
  )

  $sessionSafety = Assert-WilliamsPowerSchemeSessionSafety -Session $Session
  $ownsDestinationGuid = $sessionSafety.ownershipConfirmed
  $cleanupGuid = if ($ownsDestinationGuid) { $sessionSafety.temporaryGuid } else { $null }
  if (-not $Session.originalGuid -and $cleanupGuid) {
    throw 'power-scheme cleanup cannot restore the original scheme'
  }
  if (-not $Session.originalGuid) {
    $Session.cleanup = [ordered]@{
      valid = $true
      ownershipConfirmed = $false
      restoredGuid = $null
      temporaryGuid = [string]$Session.temporaryGuid
      temporaryGuidAbsent = $null
      absenceClassification = 'no-mutation-before-original-discovery'
      deletedQueryExitCode = $null
      controlQueryExitCode = $null
      deletionPerformed = $false
      alreadyAbsent = $false
    }
    $Session.status = 'cleaned'
    $Session.phase = 'cleaned'
    [Environment]::SetEnvironmentVariable(
      'WILLIAMS_EXPECTED_POWER_SCHEME_GUID',
      $Session.originalExpectedPowerSchemeGuidEnv,
      'Process'
    )
    Invoke-WilliamsPowerSchemeCheckpoint -Session $Session -Checkpoint $Checkpoint
    return $Session.cleanup
  }

  $events = $Session.events
  $cleanupActions = @(
    'restore',
    'restored-active',
    'query-temporary-before-delete',
    'delete-temporary',
    'query-deleted',
    'query-original-after-delete'
  )
  for ($index = $events.Count - 1; $index -ge 0; $index -= 1) {
    if ($cleanupActions -contains [string]$events[$index].action) { $events.RemoveAt($index) }
  }
  $Session.status = 'cleaning'
  $Session.phase = 'cleaning'
  $Session.cleanup = $null
  Invoke-WilliamsPowerSchemeCheckpoint -Session $Session -Checkpoint $Checkpoint
  try {
    [void](Invoke-WilliamsPowerCfgTracked -Action 'restore' -Arguments @('/setactive', $Session.originalGuid) -EventSink $events -Runner $Runner)
    Invoke-WilliamsPowerSchemeCheckpoint -Session $Session -Checkpoint $Checkpoint
    $restored = Invoke-WilliamsPowerCfgTracked -Action 'restored-active' -Arguments @('/getactivescheme') -EventSink $events -Runner $Runner
    $restoredGuid = Get-WilliamsPowerSchemeGuid -Text $restored.output
    if ($restoredGuid -ne $Session.originalGuid) {
      throw "original GUID was not restored: $restoredGuid"
    }

    if (-not $cleanupGuid) {
      $Session.cleanup = [ordered]@{
        valid = $true
        ownershipConfirmed = $false
        restoredGuid = $restoredGuid
        temporaryGuid = [string]$Session.temporaryGuid
        temporaryGuidAbsent = $false
        absenceClassification = 'unowned-target'
        deletedQueryExitCode = $null
        controlQueryExitCode = $null
        deletionPerformed = $false
        alreadyAbsent = $false
      }
      $Session.status = 'cleaned'
      $Session.phase = 'cleaned'
      Invoke-WilliamsPowerSchemeCheckpoint -Session $Session -Checkpoint $Checkpoint
      return $Session.cleanup
    }

    $beforeDeleteQuery = Invoke-WilliamsPowerCfgTracked -Action 'query-temporary-before-delete' -Arguments @('/query', $cleanupGuid) -EventSink $events -Runner $Runner -ExpectedOutcome 'any'
    $deletionPerformed = $false
    if ($beforeDeleteQuery.exitCode -eq 0) {
      [void](Invoke-WilliamsPowerCfgTracked -Action 'delete-temporary' -Arguments @('/delete', $cleanupGuid) -EventSink $events -Runner $Runner)
      $deletionPerformed = $true
      Invoke-WilliamsPowerSchemeCheckpoint -Session $Session -Checkpoint $Checkpoint
      $deletedQuery = Invoke-WilliamsPowerCfgTracked -Action 'query-deleted' -Arguments @('/query', $cleanupGuid) -EventSink $events -Runner $Runner -ExpectedOutcome 'failure'
    } else {
      $deletedQuery = $beforeDeleteQuery
    }
    $controlQuery = Invoke-WilliamsPowerCfgTracked -Action 'query-original-after-delete' -Arguments @('/query', $Session.originalGuid) -EventSink $events -Runner $Runner
    $absenceClassification = Get-WilliamsPowerSchemeAbsenceClassification `
      -QueryResult $deletedQuery `
      -ControlQueryResult $controlQuery `
      -ExpectedControlGuid $Session.originalGuid `
      -DeletedGuid $cleanupGuid
    $Session.cleanup = [ordered]@{
      valid = ($absenceClassification -eq 'scheme-absent')
      ownershipConfirmed = $ownsDestinationGuid
      restoredGuid = $restoredGuid
      temporaryGuid = $cleanupGuid
      temporaryGuidAbsent = ($absenceClassification -eq 'scheme-absent')
      absenceClassification = $absenceClassification
      deletedQueryExitCode = $deletedQuery.exitCode
      controlQueryExitCode = $controlQuery.exitCode
      deletionPerformed = $deletionPerformed
      alreadyAbsent = (-not $deletionPerformed)
    }
    if (-not $Session.cleanup.valid) {
      throw "power-scheme absence proof failed: $absenceClassification"
    }
    $Session.status = 'cleaned'
    $Session.phase = 'cleaned'
    Invoke-WilliamsPowerSchemeCheckpoint -Session $Session -Checkpoint $Checkpoint
    return $Session.cleanup
  } finally {
    [Environment]::SetEnvironmentVariable(
      'WILLIAMS_EXPECTED_POWER_SCHEME_GUID',
      $Session.originalExpectedPowerSchemeGuidEnv,
      'Process'
    )
    Invoke-WilliamsPowerSchemeCheckpoint -Session $Session -Checkpoint $Checkpoint
  }
}

function Invoke-WilliamsUnownedDestinationSelfTest {
  param([Parameter(Mandatory = $true)][string]$DestinationGuid)

  $originalGuid = '381b4222-f694-41f0-9685-ff5bb260df2e'
  $state = @{ deleteCount = 0 }
  $runner = {
    param([string[]]$Arguments)
    $command = $Arguments -join ' '
    switch -Regex ($command) {
      '^/a$' { return [pscustomobject]@{ exitCode = 0; output = 'Modern Standby available' } }
      '^/getactivescheme$' { return [pscustomobject]@{ exitCode = 0; output = "Power Scheme GUID: $originalGuid" } }
      "^/query $([regex]::Escape($DestinationGuid))$" { return [pscustomobject]@{ exitCode = 0; output = "Power Scheme GUID: $DestinationGuid" } }
      "^/query $originalGuid$" { return [pscustomobject]@{ exitCode = 0; output = "Power Scheme GUID: $originalGuid" } }
      "^/setactive $originalGuid$" { return [pscustomobject]@{ exitCode = 0; output = '' } }
      '^/delete ' { $state.deleteCount += 1; return [pscustomobject]@{ exitCode = 0; output = '' } }
      default { throw "unexpected unowned-destination self-test command: $command" }
    }
  }

  $sessionRef = [ref]$null
  $startFailed = $false
  try {
    [void](Start-WilliamsTemporaryPowerScheme -SessionOut $sessionRef -Runner $runner -DestinationGuid $DestinationGuid)
  } catch {
    $startFailed = $true
  }
  $cleanup = Stop-WilliamsTemporaryPowerScheme -Session $sessionRef.Value -Runner $runner
  return [ordered]@{
    startFailed = $startFailed
    cleanupValid = $cleanup.valid
    ownershipConfirmed = $cleanup.ownershipConfirmed
    deleteCount = $state.deleteCount
  }
}

function Invoke-WilliamsForeignDuplicateSelfTest {
  $originalGuid = '381b4222-f694-41f0-9685-ff5bb260df2e'
  $temporaryGuid = '22222222-3333-4444-8555-666666666666'
  $foreignGuid = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
  $state = @{ foreignExists = $true; foreignDeleteCount = 0 }
  $runner = {
    param([string[]]$Arguments)
    $command = $Arguments -join ' '
    switch -Regex ($command) {
      '^/a$' { return [pscustomobject]@{ exitCode = 0; output = 'Modern Standby available' } }
      '^/getactivescheme$' { return [pscustomobject]@{ exitCode = 0; output = "Power Scheme GUID: $originalGuid" } }
      "^/query $temporaryGuid$" { return [pscustomobject]@{ exitCode = 1; output = 'The power scheme does not exist.' } }
      "^/query $originalGuid$" { return [pscustomobject]@{ exitCode = 0; output = "Power Scheme GUID: $originalGuid" } }
      '^/duplicatescheme SCHEME_MIN ' { return [pscustomobject]@{ exitCode = 0; output = "Power Scheme GUID: $foreignGuid" } }
      "^/setactive $originalGuid$" { return [pscustomobject]@{ exitCode = 0; output = '' } }
      "^/query $foreignGuid$" {
        if ($state.foreignExists) { return [pscustomobject]@{ exitCode = 0; output = "Power Scheme GUID: $foreignGuid" } }
        return [pscustomobject]@{ exitCode = 1; output = 'The power scheme does not exist.' }
      }
      "^/delete $foreignGuid$" {
        $state.foreignExists = $false
        $state.foreignDeleteCount += 1
        return [pscustomobject]@{ exitCode = 0; output = '' }
      }
      default { throw "unexpected foreign-duplicate self-test command: $command" }
    }
  }

  $sessionRef = [ref]$null
  $startFailed = $false
  try {
    [void](Start-WilliamsTemporaryPowerScheme -SessionOut $sessionRef -Runner $runner -DestinationGuid $temporaryGuid)
  } catch {
    $startFailed = $true
  }
  $cleanup = Stop-WilliamsTemporaryPowerScheme -Session $sessionRef.Value -Runner $runner
  return [ordered]@{
    startFailed = $startFailed
    cleanupValid = $cleanup.valid
    createdGuid = $sessionRef.Value.createdGuid
    foreignDeleteCount = $state.foreignDeleteCount
  }
}

function Invoke-WilliamsTamperedJournalSelfTest {
  $originalGuid = '381b4222-f694-41f0-9685-ff5bb260df2e'
  $temporaryGuid = '33333333-4444-4555-8666-777777777777'
  $foreignGuid = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
  $state = @{ foreignExists = $true; deleteCount = 0 }
  $runner = {
    param([string[]]$Arguments)
    $command = $Arguments -join ' '
    switch -Regex ($command) {
      "^/setactive $originalGuid$" { return [pscustomobject]@{ exitCode = 0; output = '' } }
      '^/getactivescheme$' { return [pscustomobject]@{ exitCode = 0; output = "Power Scheme GUID: $originalGuid" } }
      "^/query $foreignGuid$" {
        if ($state.foreignExists) { return [pscustomobject]@{ exitCode = 0; output = "Power Scheme GUID: $foreignGuid" } }
        return [pscustomobject]@{ exitCode = 1; output = 'The power scheme does not exist.' }
      }
      "^/delete $foreignGuid$" {
        $state.foreignExists = $false
        $state.deleteCount += 1
        return [pscustomobject]@{ exitCode = 0; output = '' }
      }
      "^/query $originalGuid$" { return [pscustomobject]@{ exitCode = 0; output = "Power Scheme GUID: $originalGuid" } }
      default { throw "unexpected tampered-journal self-test command: $command" }
    }
  }
  $session = [ordered]@{
    schemaVersion = 1
    status = 'created'
    phase = 'created'
    originalGuid = $originalGuid
    temporaryGuid = $temporaryGuid
    createdGuid = $foreignGuid
    destinationWasAbsent = $true
    destinationAbsenceClassification = 'scheme-absent'
    duplicateStarted = $true
    originalExpectedPowerSchemeGuidEnv = $null
    capabilities = 'Modern Standby available'
    events = [System.Collections.Generic.List[object]]::new()
    cleanup = $null
  }
  $rejected = $false
  try {
    [void](Stop-WilliamsTemporaryPowerScheme -Session $session -Runner $runner)
  } catch {
    $rejected = $true
  }
  return [ordered]@{
    rejected = $rejected
    deleteCount = $state.deleteCount
  }
}

function Invoke-WilliamsPowerSchemeSelfTest {
  $originalGuid = '381b4222-f694-41f0-9685-ff5bb260df2e'
  $temporaryGuid = '11111111-2222-4333-8444-555555555555'
  $state = @{ activeGuid = $originalGuid; temporaryExists = $false; deleteCount = 0 }
  $checkpointSnapshots = [System.Collections.Generic.List[string]]::new()
  $checkpoint = {
    param($checkpointSession)
    $checkpointSnapshots.Add(($checkpointSession | ConvertTo-Json -Depth 8 -Compress))
  }
  $runner = {
    param([string[]]$Arguments)
    $command = $Arguments -join ' '
    switch -Regex ($command) {
      '^/a$' { return [pscustomobject]@{ exitCode = 0; output = 'Standby (S0 Low Power Idle) Network Connected' } }
      '^/getactivescheme$' { return [pscustomobject]@{ exitCode = 0; output = "Power Scheme GUID: $($state.activeGuid)" } }
      '^/duplicatescheme SCHEME_MIN ' {
        $state.temporaryExists = $true
        return [pscustomobject]@{ exitCode = 0; output = "Power Scheme GUID: $temporaryGuid" }
      }
      "^/query $temporaryGuid$" {
        if (-not $state.temporaryExists) { return [pscustomobject]@{ exitCode = 1; output = 'The power scheme does not exist.' } }
        return [pscustomobject]@{ exitCode = 0; output = "Power Scheme GUID: $temporaryGuid" }
      }
      "^/query $originalGuid$" { return [pscustomobject]@{ exitCode = 0; output = "Power Scheme GUID: $originalGuid" } }
      "^/setactive $temporaryGuid$" { $state.activeGuid = $temporaryGuid; return [pscustomobject]@{ exitCode = 0; output = '' } }
      "^/setactive $originalGuid$" { $state.activeGuid = $originalGuid; return [pscustomobject]@{ exitCode = 0; output = '' } }
      "^/delete $temporaryGuid$" {
        if (-not $state.temporaryExists) { return [pscustomobject]@{ exitCode = 1; output = 'already absent' } }
        $state.temporaryExists = $false
        $state.deleteCount += 1
        return [pscustomobject]@{ exitCode = 0; output = '' }
      }
      default { throw "unexpected self-test command: $command" }
    }
  }

  $sessionRef = [ref]$null
  $session = Start-WilliamsTemporaryPowerScheme -SessionOut $sessionRef -Runner $runner -DestinationGuid $temporaryGuid -Checkpoint $checkpoint
  $journalReadyBeforeFirstMutation = $false
  foreach ($snapshotJson in $checkpointSnapshots) {
    $snapshot = $snapshotJson | ConvertFrom-Json
    $snapshotActions = @($snapshot.events | ForEach-Object { $_.action })
    if (
      $snapshot.originalGuid -eq $originalGuid `
      -and $snapshot.temporaryGuid -eq $temporaryGuid `
      -and $null -eq $snapshot.createdGuid `
      -and $snapshot.destinationWasAbsent -eq $true `
      -and $snapshot.duplicateStarted -eq $true `
      -and $snapshot.phase -eq 'duplicate-pending' `
      -and (($snapshotActions -join ',') -eq 'capabilities,original-active,query-destination-before-duplicate,query-original-before-duplicate')
    ) {
      $journalReadyBeforeFirstMutation = $true
      break
    }
  }
  $staleJournalJson = $session | ConvertTo-Json -Depth 8
  $cleanup = Stop-WilliamsTemporaryPowerScheme -Session $session -Runner $runner -Checkpoint $checkpoint
  $normalCommandSequence = @($session.events | ForEach-Object { $_.action })
  $normalEvents = @($session.events)
  $recoveredSession = ConvertTo-WilliamsMutableSession -Payload ($staleJournalJson | ConvertFrom-Json)
  $retryCleanup = Stop-WilliamsTemporaryPowerScheme -Session $recoveredSession -Runner $runner -Checkpoint $checkpoint
  $retryActions = @($recoveredSession.events | ForEach-Object { $_.action })
  $preexistingDestination = Invoke-WilliamsUnownedDestinationSelfTest -DestinationGuid 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
  $originalDestination = Invoke-WilliamsUnownedDestinationSelfTest -DestinationGuid $originalGuid
  $foreignDuplicate = Invoke-WilliamsForeignDuplicateSelfTest
  $tamperedJournal = Invoke-WilliamsTamperedJournalSelfTest
  $failureState = @{ temporaryExists = $false; activeReadCount = 0 }
  $dualFailureRunner = {
    param([string[]]$Arguments)
    $command = $Arguments -join ' '
    switch -Regex ($command) {
      '^/a$' { return [pscustomobject]@{ exitCode = 0; output = 'Modern Standby available' } }
      '^/getactivescheme$' {
        $failureState.activeReadCount += 1
        $output = if ($failureState.activeReadCount -eq 1) { "Power Scheme GUID: $originalGuid" } else { 'active scheme output unavailable' }
        return [pscustomobject]@{ exitCode = 0; output = $output }
      }
      "^/query $temporaryGuid$" {
        if ($failureState.temporaryExists) { return [pscustomobject]@{ exitCode = 0; output = "Power Scheme GUID: $temporaryGuid" } }
        return [pscustomobject]@{ exitCode = 1; output = 'The power scheme does not exist.' }
      }
      "^/query $originalGuid$" { return [pscustomobject]@{ exitCode = 0; output = "Power Scheme GUID: $originalGuid" } }
      '^/duplicatescheme SCHEME_MIN ' {
        $failureState.temporaryExists = $true
        return [pscustomobject]@{ exitCode = 0; output = "Power Scheme GUID: $temporaryGuid" }
      }
      "^/setactive $temporaryGuid$" { return [pscustomobject]@{ exitCode = 0; output = '' } }
      "^/setactive $originalGuid$" { return [pscustomobject]@{ exitCode = 5; output = 'cleanup restore access denied' } }
      default { throw "unexpected dual-failure self-test command: $command" }
    }
  }
  $dualFailure = Invoke-WilliamsPowerSchemeLivePreflight -Runner $dualFailureRunner -DestinationGuid $temporaryGuid
  return [ordered]@{
    lifecycleSucceeded = ($session.status -eq 'cleaned' -and $recoveredSession.status -eq 'cleaned')
    cleanupValid = ($cleanup.valid -and $retryCleanup.valid)
    originalGuid = $session.originalGuid
    temporaryGuid = $session.temporaryGuid
    commandSequence = $normalCommandSequence
    queryDeletedExitCode = $cleanup.deletedQueryExitCode
    absenceClassification = $cleanup.absenceClassification
    journalReadyBeforeFirstMutation = $journalReadyBeforeFirstMutation
    interruptedDeleteRetrySucceeded = ($retryCleanup.valid -and $retryCleanup.alreadyAbsent)
    retrySkippedDelete = ($retryActions -notcontains 'delete-temporary')
    unownedCleanupSucceeded = (
      $preexistingDestination.startFailed `
      -and $preexistingDestination.cleanupValid `
      -and -not $preexistingDestination.ownershipConfirmed `
      -and $originalDestination.startFailed `
      -and $originalDestination.cleanupValid `
      -and -not $originalDestination.ownershipConfirmed
    )
    preexistingDestinationDeleteCount = $preexistingDestination.deleteCount
    originalDestinationDeleteCount = $originalDestination.deleteCount
    foreignGuidMismatchSafe = (
      $foreignDuplicate.startFailed `
      -and $foreignDuplicate.cleanupValid `
      -and $null -eq $foreignDuplicate.createdGuid `
      -and $foreignDuplicate.foreignDeleteCount -eq 0
    )
    tamperedJournalRejectedWithoutDelete = ($tamperedJournal.rejected -and $tamperedJournal.deleteCount -eq 0)
    livePreflightPreservesStartAndCleanupFailures = (
      [string]$dualFailure.startFailure -match 'scheme GUID' `
      -and [string]$dualFailure.cleanupFailure -match 'cleanup restore access denied' `
      -and [string]$dualFailure.failure -match 'start failed:' `
      -and [string]$dualFailure.failure -match 'cleanup failed:'
    )
    events = $normalEvents
  }
}

function Invoke-WilliamsPowerSchemeLivePreflight {
  param(
    [scriptblock]$Runner = (New-WilliamsPowerCfgRunner),
    [string]$DestinationGuid = ([guid]::NewGuid().ToString().ToLowerInvariant())
  )

  $sessionRef = [ref]$null
  $session = $null
  $startFailure = $null
  $cleanupFailure = $null
  $cleanup = $null
  try {
    $session = Start-WilliamsTemporaryPowerScheme -SessionOut $sessionRef -Runner $Runner -DestinationGuid $DestinationGuid
  } catch {
    $startFailure = $_.Exception.Message
    $session = $sessionRef.Value
  } finally {
    if ($session -and $session.originalGuid -and $session.temporaryGuid) {
      try {
        $cleanup = Stop-WilliamsTemporaryPowerScheme -Session $session -Runner $Runner
      } catch {
        $cleanupFailure = $_.Exception.Message
      }
    }
  }

  $failure = if ($startFailure -and $cleanupFailure) {
    "start failed: $startFailure; cleanup failed: $cleanupFailure"
  } elseif ($startFailure) {
    $startFailure
  } else {
    $cleanupFailure
  }

  $result = [ordered]@{
    schemaVersion = 1
    lifecycleSucceeded = ($null -eq $failure -and $session.status -eq 'cleaned')
    cleanupValid = ($cleanup -and $cleanup.valid)
    failure = $failure
    startFailure = $startFailure
    cleanupFailure = $cleanupFailure
    originalGuid = if ($session) { $session.originalGuid } else { $null }
    temporaryGuid = if ($session) { $session.temporaryGuid } else { $null }
    cleanup = $cleanup
    events = if ($session) { $session.events } else { @() }
  }
  return $result
}

function ConvertTo-WilliamsMutableSession {
  param([Parameter(Mandatory = $true)]$Payload)

  $events = [System.Collections.Generic.List[object]]::new()
  foreach ($event in @($Payload.events)) { $events.Add($event) }
  $cleanup = if ($Payload.PSObject.Properties.Name -contains 'cleanup') { $Payload.cleanup } else { $null }
  return [ordered]@{
    schemaVersion = $Payload.schemaVersion
    status = $Payload.status
    phase = if ($Payload.PSObject.Properties.Name -contains 'phase') { $Payload.phase } else { 'legacy' }
    originalGuid = $Payload.originalGuid
    temporaryGuid = $Payload.temporaryGuid
    createdGuid = $Payload.createdGuid
    duplicateReturnedGuid = if ($Payload.PSObject.Properties.Name -contains 'duplicateReturnedGuid') { $Payload.duplicateReturnedGuid } else { $null }
    destinationWasAbsent = if ($Payload.PSObject.Properties.Name -contains 'destinationWasAbsent') { $Payload.destinationWasAbsent } else { $null }
    destinationAbsenceClassification = if ($Payload.PSObject.Properties.Name -contains 'destinationAbsenceClassification') { $Payload.destinationAbsenceClassification } else { $null }
    duplicateStarted = if ($Payload.PSObject.Properties.Name -contains 'duplicateStarted') { $Payload.duplicateStarted } else { $false }
    originalExpectedPowerSchemeGuidEnv = $Payload.originalExpectedPowerSchemeGuidEnv
    capabilities = $Payload.capabilities
    events = $events
    cleanup = $cleanup
  }
}

function Write-WilliamsPowerSchemeSession {
  param(
    [Parameter(Mandatory = $true)]$Session,
    [Parameter(Mandatory = $true)][string]$Path
  )

  $fullPath = [IO.Path]::GetFullPath($Path)
  $parent = Split-Path -Parent $fullPath
  if ($parent) { [void](New-Item -ItemType Directory -Force -Path $parent) }
  $temporaryPath = "$fullPath.$([guid]::NewGuid().ToString('N')).tmp"
  try {
    [IO.File]::WriteAllText(
      $temporaryPath,
      (($Session | ConvertTo-Json -Depth 8) + [Environment]::NewLine),
      [Text.UTF8Encoding]::new($false)
    )
    if ([IO.File]::Exists($fullPath)) {
      [IO.File]::Replace($temporaryPath, $fullPath, $null, $true)
    } else {
      [IO.File]::Move($temporaryPath, $fullPath)
    }
  } finally {
    if ([IO.File]::Exists($temporaryPath)) { [IO.File]::Delete($temporaryPath) }
  }
}

if ($StartSession -and $StopSession) {
  throw 'Choose one lifecycle action: -StartSession or -StopSession.'
}

if ($StartSession) {
  if (-not $SessionPath) { throw '-SessionPath is required for -StartSession.' }
  $sessionRef = [ref]$null
  $checkpoint = { param($checkpointSession) Write-WilliamsPowerSchemeSession -Session $checkpointSession -Path $SessionPath }
  try {
    $session = if ($DestinationGuid) {
      Start-WilliamsTemporaryPowerScheme -SessionOut $sessionRef -DestinationGuid $DestinationGuid -Checkpoint $checkpoint
    } else {
      Start-WilliamsTemporaryPowerScheme -SessionOut $sessionRef -Checkpoint $checkpoint
    }
  } finally {
    if ($sessionRef.Value) { Write-WilliamsPowerSchemeSession -Session $sessionRef.Value -Path $SessionPath }
  }
  $session | ConvertTo-Json -Depth 8
  exit 0
}

if ($StopSession) {
  if (-not $SessionPath) { throw '-SessionPath is required for -StopSession.' }
  $session = ConvertTo-WilliamsMutableSession -Payload (Get-Content -Raw -LiteralPath $SessionPath | ConvertFrom-Json)
  $checkpoint = { param($checkpointSession) Write-WilliamsPowerSchemeSession -Session $checkpointSession -Path $SessionPath }
  try {
    [void](Stop-WilliamsTemporaryPowerScheme -Session $session -Checkpoint $checkpoint)
  } finally {
    Write-WilliamsPowerSchemeSession -Session $session -Path $SessionPath
  }
  $session | ConvertTo-Json -Depth 8
  exit 0
}

if ($SelfTest) {
  $result = Invoke-WilliamsPowerSchemeSelfTest
  $result | ConvertTo-Json -Depth 8
  if (
    -not $result.lifecycleSucceeded `
    -or -not $result.cleanupValid `
    -or -not $result.unownedCleanupSucceeded `
    -or -not $result.livePreflightPreservesStartAndCleanupFailures `
    -or -not $result.foreignGuidMismatchSafe `
    -or -not $result.tamperedJournalRejectedWithoutDelete `
    -or $result.preexistingDestinationDeleteCount -ne 0 `
    -or $result.originalDestinationDeleteCount -ne 0
  ) { exit 1 }
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
