# matcaps

Huge library of matcap PNG textures organized by color



## O que é Matcap



## Formato das texturas

sRBG PNG 24 bits (8 bits by chanel without alpha chanel)






https://developer.android.com/reference/android/support/v7/graphics/Palette.html
https://github.com/akfish/node-vibrant/

http://www.color.org/srgbprofiles.xalter

https://blender.stackexchange.com/a/66139

https://gist.github.com/diramazioni/9255292

# Force 8-bit output

// Add profile SRGB, convert colorspace to sRGB and remove all profiles
"magick" "image.tif" -profile sRGB2014.icc -colorspace RGB -strip "PNG24:image-6.png"

"magick" "image.tif" -depth 8 -profile sRGB2014.icc "Image4.png"

"magick" "image.tif" "image-1.png"
    -- magick.exe: profile 'icc': 0h: PCS illuminant is not D50 `image-1.png' @ warning/png.c/MagickPNGWarningHandler/1748.

"magick" "image.tif" -depth 8 "image-2.png"

"magick" "image.tif" -depth 8 -profile sRGB2014.icc "image-3.png"

"magick" "image.tif" "PNG24:image-4.png"

"magick" "image.tif"  -profile sRGB2014.icc  "PNG24:image-5.png"

"magick" identify -verbose "image-5.png"


-set colorspace sRGB


magick rose: rose.tif
magick rose.tif -colorspace RGB -filter Box -resize 35x23 -colorspace sRGB rose1.tif
magick rose.tif -set colorspace sRGB -colorspace RGB roseRGB.tif
magick roseRGB.tif -filter Box -resize 35x23 roseSMALL.tif
magick roseSMALL.tif -set colorspace RGB -colorspace sRGB rose2.tif


<table style="width:100%">
  <tr>
    <th>Firstname</th>
    <th>Lastname</th>
    <th>Age</th>
  </tr>
  <tr>
    <td>Jill</td>
    <td>Smith</td>
    <td>50</td>
  </tr>
  <tr>
    <td>Eve</td>
    <td>Jackson</td>
    <td>94</td>
  </tr>
</table>

# Matcaps

| Italic | Block letters | Block letters |
| ---- | --- | --- |
| ![](128/2A2A2A_2A2A2A_DBDBDB_6A6A6A-128px.png) | ![](palette/2A2A2A_2A2A2A_DBDBDB_6A6A6A-palette.png) | ![](preview/2A2A2A_2A2A2A_DBDBDB_6A6A6A-preview.jpg) |
