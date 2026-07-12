param(
  [string]$ProjectRef = 'bxxokttlytmdceadqqsh'
)

$ErrorActionPreference = 'Stop'
$baseUrl = "https://$ProjectRef.supabase.co"
$password = 'password123'

$keyJson = npx supabase@latest projects api-keys `
  --project-ref $ProjectRef `
  --reveal `
  --output json

if ($LASTEXITCODE -ne 0) {
  throw 'Unable to retrieve API keys. Run `npx supabase login` and try again.'
}

$adminKey = ($keyJson | ConvertFrom-Json |
  Where-Object { $_.type -eq 'secret' -or $_.name -eq 'service_role' } |
  Select-Object -First 1).api_key

if (-not $adminKey -or $adminKey.Contains('*')) {
  throw 'No revealed Supabase admin key was available.'
}

$headers = @{
  apikey = $adminKey
  Authorization = "Bearer $adminKey"
  'Content-Type' = 'application/json'
}

$accounts = @(
  @{ name = 'Ms. Sarah Tan'; email = 'counselor@talkitout.sg'; age = 35; school = $null; role = 'counselor'; guardianConsent = $true },
  @{ name = 'Wei Jie'; email = 'weijie@student.sg'; age = 15; school = 'River Valley High School'; role = 'student'; guardianConsent = $true },
  @{ name = 'Priya Kumar'; email = 'priya@student.sg'; age = 17; school = 'National Junior College'; role = 'student'; guardianConsent = $true },
  @{ name = 'Marcus Lim'; email = 'marcus@student.sg'; age = 14; school = 'Raffles Institution'; role = 'student'; guardianConsent = $true },
  @{ name = 'Aisha Rahman'; email = 'aisha@student.sg'; age = 16; school = 'Dunman High School'; role = 'student'; guardianConsent = $true },
  @{ name = 'Ethan Ng'; email = 'ethan@student.sg'; age = 13; school = 'School of Science and Technology'; role = 'student'; guardianConsent = $true }
)

$existingResponse = Invoke-RestMethod `
  -Method Get `
  -Uri "$baseUrl/auth/v1/admin/users?page=1&per_page=1000" `
  -Headers $headers
$existingUsers = @($existingResponse.users)
$created = 0
$updated = 0

foreach ($account in $accounts) {
  $metadata = @{
    name = $account.name
    age = $account.age
    school = $account.school
    guardianConsent = $account.guardianConsent
  }
  $user = $existingUsers | Where-Object { $_.email -eq $account.email } | Select-Object -First 1

  if ($user) {
    $body = @{
      password = $password
      email_confirm = $true
      user_metadata = $metadata
    } | ConvertTo-Json -Depth 5
    $user = Invoke-RestMethod `
      -Method Put `
      -Uri "$baseUrl/auth/v1/admin/users/$($user.id)" `
      -Headers $headers `
      -Body $body
    $updated++
  } else {
    $body = @{
      email = $account.email
      password = $password
      email_confirm = $true
      user_metadata = $metadata
    } | ConvertTo-Json -Depth 5
    $user = Invoke-RestMethod `
      -Method Post `
      -Uri "$baseUrl/auth/v1/admin/users" `
      -Headers $headers `
      -Body $body
    $created++
  }

  $profileBody = @{
    name = $account.name
    email = $account.email
    age = $account.age
    school = $account.school
    role = $account.role
    guardian_consent = $account.guardianConsent
  } | ConvertTo-Json -Depth 5
  Invoke-RestMethod `
    -Method Patch `
    -Uri "$baseUrl/rest/v1/profiles?id=eq.$($user.id)" `
    -Headers ($headers + @{ Prefer = 'return=minimal' }) `
    -Body $profileBody | Out-Null
}

Write-Output "Demo accounts ready: $created created, $updated refreshed."
Write-Output 'Student demo: weijie@student.sg / password123'
Write-Output 'Counselor demo: counselor@talkitout.sg / password123'
