function Get-TuGetDotEnvValue {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    return $null
  }

  foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
      continue
    }
    if ($Matches[1] -ne $Name) {
      continue
    }

    $value = $Matches[2].Trim()
    if ($value.Length -ge 2) {
      $first = $value[0]
      $last = $value[$value.Length - 1]
      if (($first -eq '"' -and $last -eq '"') -or ($first -eq "'" -and $last -eq "'")) {
        $value = $value.Substring(1, $value.Length - 2)
      }
    }
    return $value
  }

  return $null
}

function Set-TuGetDevelopmentLicenseEnvironment {
  param(
    [Parameter(Mandatory = $true)]
    [string]$WorkspaceRoot
  )

  $serverEnvPath = Join-Path $WorkspaceRoot 'server\.env'
  $secretSource = 'TUGET_LICENSE_HMAC_SECRET 环境变量'
  if ([string]::IsNullOrWhiteSpace($env:TUGET_LICENSE_HMAC_SECRET)) {
    $serverSecret = Get-TuGetDotEnvValue -Path $serverEnvPath -Name 'HMAC_SECRET_TUGET'
    if ([string]::IsNullOrWhiteSpace($serverSecret) -or $serverSecret -like 'your-*-here') {
      throw "未找到有效的图个吉利授权密钥。请在 $serverEnvPath 中配置 HMAC_SECRET_TUGET。"
    }
    $env:TUGET_LICENSE_HMAC_SECRET = $serverSecret
    $secretSource = 'server/.env 的 HMAC_SECRET_TUGET'
  }

  $serverUrlSource = 'TUGET_LICENSE_SERVER_URL 环境变量'
  [Uri]$configuredUrl = $null
  [string]$configuredUrlText = $env:TUGET_LICENSE_SERVER_URL
  # An unset environment variable is $null (not ''). Without a string cast,
  # PowerShell can select TryCreate(Uri, Uri, ref Uri) and cast UriKind to Uri.
  $validLocalUrl = -not [string]::IsNullOrWhiteSpace($configuredUrlText) -and
    [Uri]::TryCreate($configuredUrlText.Trim(), [UriKind]::Absolute, [ref]$configuredUrl) -and
    $configuredUrl.Scheme -in @('http', 'https') -and $configuredUrl.IsLoopback -and
    [string]::IsNullOrEmpty($configuredUrl.UserInfo) -and [string]::IsNullOrEmpty($configuredUrl.Query) -and
    [string]::IsNullOrEmpty($configuredUrl.Fragment)
  if (-not $validLocalUrl) {
    $serverPort = Get-TuGetDotEnvValue -Path $serverEnvPath -Name 'PORT'
    $parsedPort = 0
    if (-not [int]::TryParse($serverPort, [ref]$parsedPort) -or $parsedPort -lt 1 -or $parsedPort -gt 65535) {
      $parsedPort = 3001
    }
    $env:TUGET_LICENSE_SERVER_URL = "http://127.0.0.1:$parsedPort"
    $serverUrlSource = 'server/.env 的 PORT'
  }

  return [pscustomobject]@{
    ServerUrl = $env:TUGET_LICENSE_SERVER_URL
    ServerUrlSource = $serverUrlSource
    SecretSource = $secretSource
  }
}
