# ./serve.ps1

$folder = 'a'
$port = 1234
$types = @{
    'css'= 'text/css';
    'html'= 'text/html';
    'ico'= 'image/x-icon';
    'js'= 'application/javascript';
    'json'= 'application/json'
}
$url = 'http://localhost:' + $port + '/'

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($url)
$listener.Start()

Write-Host ('localhost:' + $port)

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $file = $folder + $context.Request.Url.LocalPath
    $type = [System.IO.Path]::GetExtension($file)
    if ($type) { $type = $types[$type.Substring(1)] }
    if ($type -and (Test-Path $file -PathType Leaf)) {
        $content = Get-Content -Path $file
    } else {
        $type = 'text/html'
        $content = Get-Content -Path ($folder + '/x.html')
    }
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
    $response = $context.Response
    $response.ContentType = $type
    $output = $response.OutputStream
    $output.Write($bytes, 0, $bytes.Length)
    $output.Close()
}
