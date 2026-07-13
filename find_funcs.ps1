$files = Get-ChildItem -Path "C:\Users\NITHIN S SHETTY\.gemini\antigravity\scratch\pawtrace" -Filter *.js
foreach ($file in $files) {
    Write-Output "=== File: $($file.Name) ==="
    $content = Get-Content -Path $file.FullName -Raw
    
    # Regex to find standard function definitions
    $matches = [regex]::Matches($content, "(?m)^ *(?:export *)?function *([a-zA-Z0-9_]+) *\(([^)]*)\)")
    foreach ($m in $matches) {
        $name = $m.Groups[1].Value
        $params = $m.Groups[2].Value -replace '\s+', ' '
        Write-Output "  - Function: $name($($params.Trim()))"
    }

    # Regex to find arrow functions assigned to const/let
    $arrowMatches = [regex]::Matches($content, "(?m)^ *(?:export *)?(?:const|let) *([a-zA-Z0-9_]+) *= *\(([^)]*)\) *=>")
    foreach ($m in $arrowMatches) {
        $name = $m.Groups[1].Value
        $params = $m.Groups[2].Value -replace '\s+', ' '
        Write-Output "  - Arrow: $name($($params.Trim()))"
    }
}
