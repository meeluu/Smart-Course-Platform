## Introduction

Virtual reality (VR) is a computer-generated model of experiencing in which, although the surrounding is not real in the technical sense, they appear to be so. Creating immersive visualizations remains challenging, and often require complex low-level programming and tedious manual encoding of data attributes to geometric and visual properties.

Advantages of VR for visual exploration: 

1. More data visualization possibilities: many more dimensions than the traditional placement coordinates (X,Y, and Z) become available. It can even be classified according to direction or magnitude of a vector. 

2. Intuitive approach: the way VR will present data is the way we interact with the world at large.

3. Multiple users: when data is presented in VR, multiple users can inhabit the environment at the same time.

4. Eliminating distractions: with a user tapped into data presented in VR, their visual and to some extent aural senses are completely governed by the virtual environment.

This project will be built on DXR toolkit. DXR is help developers efficiently specify visualization designs using a concise declarative visualization grammar inspired by Vega-Lite. A GUI is provided for easy and quick edits and previews of visualization designs in-situ. Reusable templates and customizable graphical marks are also provided to enable unique and engaging visualizations. 

A typical DXR toolkit system scenario is as below: (1) the designer describes the visualization design in a concise specification (vis-specs) using DXR’s high-level visualization grammar. (2) DXR then infers missing visualization parameters with sensible defaults. (3) Based on this complete specification, DXR then programmatically constructs the 3D visualization that the designer can place in a real or virtual immersive scene. 

## Project Task

*  Run demos and examples in a VR environment.

*  Summarize the shortcomings of visualizations in this toolkit and consider methods to improve them. 

## Schedule

*  Reproduce the paper result (3-5 week)

*  Find some patterns in a dataset (6-7 week)

*  Conclude the shortcoming of the paper in VR scenarios (6-7 week)

*  Mid-term inspection (8 week)

*  Find a way to optimize the toolkit (9-15 week)

*  Final inspection (16-17 week)

## Implementation tools

*  DXR

*  HTC Vive

*  Unity Editor 

## Resources

*  Paper: https://vcg.seas.harvard.edu/publications/dxr-a-toolkit-for-building-immersive-data-visualizations

*  Source Code: https://github.com/ronellsicat/DxR

*  Datasets:
   *  DXR Data (included in source): https://github.com/ronellsicat/DxR/tree/master/Assets/StreamingAssets/DxRData
   *  IATK Data: https://github.com/MaximeCordeil/IATK/tree/master/Assets/Datasets