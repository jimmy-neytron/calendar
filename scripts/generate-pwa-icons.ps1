param(
  [string]$OutputDirectory = "public\icons"
)

Add-Type -AssemblyName System.Drawing

$resolvedOutput = Join-Path (Get-Location) $OutputDirectory
New-Item -ItemType Directory -Force -Path $resolvedOutput | Out-Null

function New-AppIcon {
  param(
    [int]$Size,
    [string]$FileName,
    [bool]$Maskable = $false
  )

  $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::FromArgb(5, 5, 5))

  $padding = if ($Maskable) { [int]($Size * 0.18) } else { [int]($Size * 0.08) }
  $cardSize = [single]($Size - (2 * $padding))
  $card = [System.Drawing.RectangleF]::new(
    [single]$padding,
    [single]$padding,
    $cardSize,
    $cardSize
  )
  $radius = [single]($Size * 0.16)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $radius * 2
  $path.AddArc($card.X, $card.Y, $diameter, $diameter, 180, 90)
  $path.AddArc($card.Right - $diameter, $card.Y, $diameter, $diameter, 270, 90)
  $path.AddArc($card.Right - $diameter, $card.Bottom - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($card.X, $card.Bottom - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()

  $backgroundBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    $card,
    [System.Drawing.Color]::FromArgb(34, 211, 238),
    [System.Drawing.Color]::FromArgb(99, 102, 241),
    [single]45
  )
  $graphics.FillPath($backgroundBrush, $path)

  $calendarPadding = [int]($Size * 0.22)
  $calendar = [System.Drawing.RectangleF]::new(
    [single]$calendarPadding,
    [single]($Size * 0.25),
    [single]($Size - (2 * $calendarPadding)),
    [single]($Size * 0.48)
  )
  $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(248, 250, 252))
  $graphics.FillRectangle($whiteBrush, $calendar)

  $headerBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(99, 102, 241))
  $graphics.FillRectangle($headerBrush, $calendar.X, $calendar.Y, $calendar.Width, [int]($Size * 0.13))

  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(168, 85, 247), [single]($Size * 0.045))
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLines($pen, @(
    (New-Object System.Drawing.PointF([single]($Size * 0.36), [single]($Size * 0.55))),
    (New-Object System.Drawing.PointF([single]($Size * 0.46), [single]($Size * 0.64))),
    (New-Object System.Drawing.PointF([single]($Size * 0.66), [single]($Size * 0.43)))
  ))

  $bitmap.Save((Join-Path $resolvedOutput $FileName), [System.Drawing.Imaging.ImageFormat]::Png)
  $pen.Dispose()
  $headerBrush.Dispose()
  $whiteBrush.Dispose()
  $backgroundBrush.Dispose()
  $path.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

New-AppIcon -Size 192 -FileName "icon-192.png"
New-AppIcon -Size 512 -FileName "icon-512.png"
New-AppIcon -Size 512 -FileName "icon-maskable-512.png" -Maskable $true
New-AppIcon -Size 180 -FileName "apple-touch-icon.png"
