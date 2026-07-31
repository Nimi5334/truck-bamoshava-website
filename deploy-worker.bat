@echo off
setlocal

set CLOUDFLARE_API_TOKEN=cfut_APDvNYZaFxIFu2hjC66HgyDRUrdoth2npCoi0E4Of9727051
cd /d "E:\users\nimrod\desktop\Ai projects\website\.claude\worktrees\vigorous-haslett-287b80\leverage-cms\worker"

echo ===== Setting GH_APP_ID =====
echo 4068493| wrangler secret put GH_APP_ID

echo.
echo ===== Setting GH_APP_PRIVATE_KEY =====
(
echo -----BEGIN RSA PRIVATE KEY-----
echo MIIEpQIBAAKCAQEA84fYJwMu6szFr5I5R+SqyWiJvs66lTPT1Y8B6zk63VUNrkAN
echo oK+xBURN2sMkNzhl6tDLh1L9CsxrR70ftOoE/bp5gRjYsMaH9/Iese0gelS7IoEs
echo +M0tIc8YNUx3b09EKKMu3dXl8KbLtkc1IMocGi7RCJ1NnKyxHT00QgYGEHHxfnVq
echo SQUUDl7kBRKBbdcH+bDZ0YyOVj7qden78ibezNZKOehFZ6MIED5gi6aLJ8iOhVDZ
echo l8qYoFFwzyC2M9nZRGfXElDr+uXfD3yy8121iXcgBS8Qhlj8yIoaT7rReYBaSkT+
echo CQcp2lV4wS0Vt/g1Kpuk00TZk4hVvM6vlGg4uwIDAQABAoIBAQDzhfEZOe6try0z
echo n1YWVUyPcTDlFBayYow/Lu0tSiJZ99ZhW/4EpAuxh5cO3jqV2ZjY0gfkf5E4Pig9
echo KZrOL4HkM5eTB8SQKUcIIx6cr9HdYmNrYp8VAR9TgqLjkV6ReUNgG6YfAOkZ18E3
echo ukcfTdwCNrSjF6HnvSyzX2Olbh6cS1FcoW7TZjjleaTSA6txvP7+HC7P/6wshZ3g
echo fXBGPGqHZQD+Z/KORfG9RbiwVAhnHDm7kz934Ae12+gd4u69YLEIwhrHe1bkMH4e
echo qK47pW0l4aOd5sJAY30gk5eVkqgVbxfvG0AGy03bVlCf/qnXTDkFh2PKPVnUlvRC
echo ocZNpsMZAoGBAPw444Idm6AgbtEYWhjaioVgABU8J5ZoYYR/QdXaQzOe7/yMO8jk
echo RcT8dHXBcDL7d46iB2IMoQ/NNjM1QFWiBdSUckLIRDcjve8Q4R8mircmnTFuvT/Q
echo K3/+1RW8s+AbU0MsD+rKCk/+LSd50qWUaQEdxlQQ0QrQM2dZx3rKGeSdAoGBAPct
echo oQTFsQHpy4R8gXrm9mWIeIZw+FdVCwK+KZzVrbg0I8uHwWWiDeHBMSI7YRCb5M6f
echo SziByv/erqszgu2UEZiEFkThJy2SGUigzWkaVKMZL9ts1EbxffqWIhjW8PegHCuv
echo FnT+U0SL7tUXjvaCH4JLYyX+p+blfEewynmeJhc3AoGBAI2pQhcNnCAGt1cXb1sw
echo O8cHkWRb4fw3ajYp54c+TKpMpYvaE6YUmB84kAyndeYcmRzyYmUupLOkVcHTMewm
echo 0VGBgt+Bbdbuazo/58FAO3784CMoiICz4grEzVelIf5IOq6qq9H6YmplX2Uhpi87
echo uPJYj9EdlNuW7pgos8KCiqJ9AoGBAIf2OFjYqVnlEUaJ+erxulz1KV7CK0hWhhz3
echo Hwqe2tS1EW91+CKAdmRUkUNEKEsrhTtGkei+NDx0b93KEt2+EcOz/E/dDWDauT+i
echo +/oxOpcQVqu6/DUdxu8cwBqruJZtIrHAuHiYIJNW6YObVs8vmkdgUmRm5FJ0rtz8
echo WRN2s3sXAoGAY+ADNkARjIemOPaKVpAm1EMIk9WqrXVhvaqBY9jJQiBFpcOSe3IB
echo vrCKY02FwYBJE2qrI9eA6eI7uxOcmzoMtuxV0dfjssaGljmWxsOhz2EQFsQHxLJ4
echo 1Tl7jgalRti3haSfdfa/4GVPYBbV377K0MGi4MNLON2WfqVFgSyDXe0=
echo -----END RSA PRIVATE KEY-----
) | wrangler secret put GH_APP_PRIVATE_KEY

echo.
echo ===== Setting JWT_SIGNING_SECRET =====
echo leverage-cms-jwt-secret-nimrod-2026-truckbamoshava-xK9mP2qR| wrangler secret put JWT_SIGNING_SECRET

echo.
echo ===== Deploying Worker =====
wrangler deploy > "%~dp0deploy-output.txt" 2>&1
type "%~dp0deploy-output.txt"

echo.
echo ===== DONE =====
pause
