Write-Host "============================================" -ForegroundColor Cyan
Write-Host "      STARTING PITAKA API SERVER" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$networkIPs = (Get-NetIPAddress | Where-Object {
    ($_.InterfaceAlias -like "*Ethernet*" -or $_.InterfaceAlias -like "*Wi-Fi*") -and 
    $_.AddressFamily -eq "IPv4" -and
    !$_.IPAddress.StartsWith("169.254") 
}).IPAddress

if ($networkIPs) {
    $networkIP = $networkIPs | Where-Object { $_ -ne "127.0.0.1" } | Select-Object -First 1
    
    Write-Host "✅ Network IP detected: $networkIP" -ForegroundColor Green
    Write-Host "   For mobile devices, use this IP to connect to your API server:" -ForegroundColor Cyan
    Write-Host "   http://$($networkIP):5000" -ForegroundColor Yellow
    
    try {
        $testPort = New-Object System.Net.Sockets.TcpClient
        $testPort.Connect($networkIP, 5000)
        $testPort.Close()
        Write-Host "✅ Port 5000 is open and accessible" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Port 5000 is not accessible on $networkIP (this is expected if server is not running yet)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️ Could not detect network IP automatically" -ForegroundColor Yellow
    Write-Host "   You may need to manually configure the IP in your mobile app" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Checking MongoDB status..." -ForegroundColor Cyan
$mongoRunning = $false

try {
    $mongoService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
    
    if ($mongoService -and $mongoService.Status -eq "Running") {
        Write-Host "✅ MongoDB service is running" -ForegroundColor Green
        $mongoRunning = $true
    } else {
        Write-Host "❌ MongoDB service is not running" -ForegroundColor Red
        
        if ($mongoService) {
            Write-Host "   Attempting to start MongoDB service..." -ForegroundColor Yellow
            try {
                Start-Service -Name "MongoDB"
                Write-Host "✅ MongoDB service started successfully" -ForegroundColor Green
                $mongoRunning = $true
            } catch {
                Write-Host "❌ Failed to start MongoDB service: $($_.Exception.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "   MongoDB service not found. If MongoDB is installed, make sure it's running before starting the server." -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "❌ Error checking MongoDB status: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Checking Node.js..." -ForegroundColor Cyan
try {
    $nodeVersion = node -v
    Write-Host "✅ Node.js is installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "   Please install Node.js before running the server" -ForegroundColor Red
    Exit 1
}

Write-Host ""
Write-Host "Setting environment variables..." -ForegroundColor Cyan
if ($networkIP) {
    $env:SERVER_IP = $networkIP
    Write-Host "✅ Set SERVER_IP=$networkIP" -ForegroundColor Green
}

$env:NODE_ENV = "development"
Write-Host "✅ Set NODE_ENV=development" -ForegroundColor Green

Write-Host ""
Write-Host "Starting server in development mode..." -ForegroundColor Magenta
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host "--------------------------------------------" -ForegroundColor Cyan

$envFile = ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "Creating .env file for development..." -ForegroundColor Yellow
    @"
# Development Environment Variables
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/pitaka
JWT_SECRET=developmentsecret123
"@ | Out-File -FilePath $envFile -Encoding utf8
    Write-Host "✅ Created .env file with development settings" -ForegroundColor Green
}

npm run dev 