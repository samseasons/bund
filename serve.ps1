# ./serve.ps1

$folder = 'a'
$port = 1234
$types = @{
    css = 'text/css';
    html = 'text/html';
    ico = 'image/x-icon';
    js = 'application/javascript'
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add('http://localhost:' + $port + '/')
$listener.Start()

Write-Host ('localhost:' + $port)

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $file = $folder + $context.Request.Url.LocalPath
        if (!(Test-Path $file -PathType Leaf)) { $file = $folder + '/x.html' }
        $type = [System.IO.Path]::GetExtension($file)
        if ($type) { $type = $types[$type.Substring(1)] }
        $content = Get-Content -Path $file
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
        $response = $context.Response
        if ($type) { $response.ContentType = $type }
        $output = $response.OutputStream
        $output.Write($bytes, 0, $bytes.Length)
        $output.Close()
    }
} finally {
    $listener.Stop()
}