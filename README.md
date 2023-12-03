<div align="center">
    <h1>MatCaps</h1>
    <img src="./resources/repository-open-graph.jpg" width="882" />
    <p align="center">
        A huge library of MatCap textures in PNG and ZMT.
    </p>
    <p align="center">
       Dynamic Gallery View at https://observablehq.com/d/2c53c7ee9f619740?ui=classic
    </p>
</div>

<br>

TLDR; Scroll to bottom of page to explore textures, or access the dynamic gallery created by [Lionel Radisson](https://github.com/MAKIO135) at https://observablehq.com/d/2c53c7ee9f619740?ui=classic


  
## What is MatCap?

In [3D computer graphics](https://en.wikipedia.org/wiki/3D_computer_graphics), the appearance of an 3D object depends on 
several things:

- the [surface normals](https://en.wikipedia.org/wiki/Normal_(geometry)) (which determine how the object is shaded);
- the [point from which the object is viewed](https://en.wikipedia.org/wiki/Virtual_camera_system#Fixed);
- the [lighting setup](https://en.wikipedia.org/wiki/Computer_graphics_lighting) (orientation and types of lights);
- and [how the surface reacts to that lighting](https://en.wikipedia.org/wiki/Shading) (for example, how shiny it is).

MatCap (**Material Capture**, also known as **LitSphere**) are complete [materials](https://en.wikipedia.org/wiki/Materials_system), including lighting 
and reflections, so you can add it to an object and not have any need for, well, lighting and reflections. MatCaps 
allows you to create a surface material and lighting environment simply by painting an object so that it looks like 
how you want your surface to appear. This opens up all sorts of interesting possibilities for non-photoreal 
image rendering.

The key to using a MatCap texture is that is is mapped to the object’s normals (which exist in relation to the camera) 
defining a color for every vertex normal direction relative to the camera, and your material is set to shadeless 
(because you don’t need lights to have any influence, as they are a part of the MatCap texture). So as the camera moves 
around the object, the reflections and highlights move around your object (as if the object were moving and not the 
camera). In other words, if your object were a sphere, no matter how you looked at it, it would look like the matcap 
sphere (reflections always in the same place, e.g.). But as your object takes non-spherical shapes, thus changing the 
normals, the material responds as if it were made of the complex material.

MatCap is most commonly used for [sculpting](https://en.wikipedia.org/wiki/Digital_sculpting), as it gives quick and 
useful feedback on how an objects shape is changing. It also works with rendering, to an extent (good when you need to 
do a quick show-off-your-model render and don’t have time to set up any complex lights or materials). It's very cheap, 
and looks great when the camera doesn't rotate.




### Applying MatCaps

The MatCap technique, besides being extremely computationally fast, is a very simple algorithm to implement. Below is a 
list of some implementations for the most popular tools and frameworks.

 
- OpenGL/WebGL
    - [Realistic Materials in OpenGL ES](http://mua.github.io/matcap-webgl.html)
    ````glsl
    // -------------------------------
    // Vertex
    // -------------------------------
    vNormal = normalize(vec3(world * vec4(normal, 0.0)));

    // -------------------------------
    // Fragment
    // -------------------------------
    highp vec2 muv = vec2(view * vec4(normalize(vNormal), 0))*0.5+vec2(0.5,0.5);
    gl_FragColor = texture2D(matcapTexture, vec2(muv.x, 1.0-muv.y));
    ````
    - [MatCap with WebGL](http://mua.github.io/pages/opengl-es-matcap.html)
- [THREE.js](https://threejs.org/)
    - [MeshMatcapMaterial](https://threejs.org/docs/#api/en/materials/MeshMatcapMaterial)
    - [Creating a Spherical Reflection/Environment Mapping shader](https://www.clicktorelease.com/blog/creating-spherical-environment-mapping-shader/)
    - [Spherical Environment Mapping (MatCap/LitSphere) and Normal Mapping](https://www.clicktorelease.com/code/spherical-normal-mapping/)
    - [Webgl Materials MatCap](https://threejs.org/examples/webgl_materials_matcap.html)
- [Unity 3D](https://unity.com/)
    - [Infinite Possibility Of MatCap Shader](http://viclw17.github.io/2016/05/01/MatCap-Shader-Showcase/)
    - [MatCap - Wiki](https://wiki.unity3d.com/index.php/MatCap)
    - [World Space MatCap Shading](https://medium.com/@cyrilltoboe/world-space-matcap-shading-1d8f2a0ee296)
- [Blender 3D](https://www.blender.org)
    - [Matcap Generator](https://bensimonds.com/2010/07/30/matcap-generator/)
    - [NEW MATCAPS! - Blender 2.8](https://www.blendernation.com/2018/07/31/new-matcaps-blender-2-8/)



## Textures

All textures available in this repository are delivered in [24-bit](https://en.wikipedia.org/wiki/Color_depth) [PNG format](https://en.wikipedia.org/wiki/Portable_Network_Graphics) (8 bits per channel - without [alpha channel](https://en.wikipedia.org/wiki/Alpha_compositing)) with [sRGB colorspace](https://en.wikipedia.org/wiki/SRGB) (_[IEC 61966-2-1:1999](http://www.color.org/chardata/rgb/srgb.xalter)_). Converting images to sRGB uses the [ICC sRGB v2 profiles (sRGB2014.icc)](http://www.color.org/srgbprofiles.xalter#v2). Images do not have [embedded ICC profiles](http://www.color.org/profile_embedding.xalter), all are removed during automated processing.


### Downloading

You can download each individual artifact from the detail page (see image below), or if you prefer, you can download the full package (grouped by image resolution) from the [releases page](https://github.com/nidorx/matcaps/releases).

![](resources/preview-info.png)


## License

The MatCaps made available in this repository were obtained from various websites and web pages, in particular from the links below and the referenced pages.

Due to the amount of existing material and the naming standard used here (Filename = main colors) it was not possible to maintain the relationship for the original authors of the file. I recommend that after identifying the original image, seek out the original author to give him credit for the work done and for sharing such texture.

- [ Matcap repository](http://archive.zbrushcentral.com/showthread.php?46175-Matcap-repository)
- [Pixologic's Matcap Library](https://pixologic.com/zbrush/downloadcenter/library/)
    > Don't worry, Pixologic already gives them out for free. Just not in PNG form.
- [BadKing - ZBrush Development & Resources](https://www.badking.com.au/site/product-category/materials/page/2/)

## Page 1
[![](preview/page-1.jpg)](PAGE-1.md)
## Page 2
[![](preview/page-2.jpg)](PAGE-2.md)
## Page 3
[![](preview/page-3.jpg)](PAGE-3.md)
## Page 4
[![](preview/page-4.jpg)](PAGE-4.md)
## Page 5
[![](preview/page-5.jpg)](PAGE-5.md)
## Page 6
[![](preview/page-6.jpg)](PAGE-6.md)
## Page 7
[![](preview/page-7.jpg)](PAGE-7.md)
## Page 8
[![](preview/page-8.jpg)](PAGE-8.md)
## Page 9
[![](preview/page-9.jpg)](PAGE-9.md)
## Page 10
[![](preview/page-10.jpg)](PAGE-10.md)
## Page 11
[![](preview/page-11.jpg)](PAGE-11.md)
## Page 12
[![](preview/page-12.jpg)](PAGE-12.md)
## Page 13
[![](preview/page-13.jpg)](PAGE-13.md)
## Page 14
[![](preview/page-14.jpg)](PAGE-14.md)
## Page 15
[![](preview/page-15.jpg)](PAGE-15.md)
## Page 16
[![](preview/page-16.jpg)](PAGE-16.md)
## Page 17
[![](preview/page-17.jpg)](PAGE-17.md)
## Page 18
[![](preview/page-18.jpg)](PAGE-18.md)
## Page 19
[![](preview/page-19.jpg)](PAGE-19.md)
## Page 20
[![](preview/page-20.jpg)](PAGE-20.md)
## Page 21
[![](preview/page-21.jpg)](PAGE-21.md)
## Page 22
[![](preview/page-22.jpg)](PAGE-22.md)
## Page 23
[![](preview/page-23.jpg)](PAGE-23.md)
## Page 24
[![](preview/page-24.jpg)](PAGE-24.md)
## Page 25
[![](preview/page-25.jpg)](PAGE-25.md)
## Page 26
[![](preview/page-26.jpg)](PAGE-26.md)
## Page 27
[![](preview/page-27.jpg)](PAGE-27.md)
## Page 28
[![](preview/page-28.jpg)](PAGE-28.md)
## Page 29
[![](preview/page-29.jpg)](PAGE-29.md)
## Page 30
[![](preview/page-30.jpg)](PAGE-30.md)
## Page 31
[![](preview/page-31.jpg)](PAGE-31.md)
## Page 32
[![](preview/page-32.jpg)](PAGE-32.md)
## Page 33
[![](preview/page-33.jpg)](PAGE-33.md)
