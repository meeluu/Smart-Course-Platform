## Classification in Cryo-Electron Tomograms

#### [SHREC 2020](http://www.shrec.net/) Track

##### Motivation

There is a noticeable gap in knowledge about the organization of cellular life at the mesoscopic level. With the advent of the direct electron detectors and the associated resolution revolution, cryo-electron tomography (cryo-ET) has the potential to bridge this gap by simultaneously visualizing the cellular architecture and structural details of macromolecular assemblies, thee-dimensionally. The technique offers insights in key cellular processes and opens new possibilities for rational drug design. However, the biological samples are radiation sensitive, which limits the maximal resolution and signal-to-noise ratio. Innovation in computational methods remains key to derive biological information from the tomograms.

##### Task

In this SHREC track, we propose a task of localization and classification of biological particles in the cryo-electron tomogram volume. We provide physics-based simulation of cryo-electron tomograms and annotations for all of them except the test tomogram. We hope that this will enable researchers to try out different methods, including machine learning and statistical approaches. All 3D object retrieval and 3D electron microscopy experts interested in computational cryo-ET are welcome to participate.

##### Dataset

To provide participants with as accurate ground truth information as possible, we have created a physics-based simulator to generate cryo-electron tomograms.

The dataset consists of 10 tomograms, with 1nm/voxel resolution, with a size of 512x512x512 voxels. Each tomogram is packed with on average 2500 bio-particles of 12 uniformly distributed and rotated different proteins, various in size and structure, with the following [PDB](https://www.rcsb.org/) identificators:

- [1bxn](https://www.rcsb.org/structure/1bxn)
- [1qvr](https://www.rcsb.org/structure/1qvr)
- [1s3x](https://www.rcsb.org/structure/1s3x)
- [1u6g](https://www.rcsb.org/structure/1u6g)
- [2cg9](https://www.rcsb.org/structure/2cg9)
- [3cf3](https://www.rcsb.org/structure/3cf3)
- [3d2f](https://www.rcsb.org/structure/3d2f)
- [3gl1](https://www.rcsb.org/structure/3gl1)
- [3h84](https://www.rcsb.org/structure/3h84)
- [3qm1](https://www.rcsb.org/structure/3qm1)
- [4cr2](https://www.rcsb.org/structure/4cr2)
- [4d8q](https://www.rcsb.org/structure/4d8q)

For each tomogram but the test one, we also provide:

1. Ground truth volume
2. Ground truth tilt angle projections (using which the tomogram was constructed)
3. Noise-free ground truth volume (ground truth without water and structural noise)
4. Noise-free ground truth tilt angle projections
5. Text file with locations and PDB ID of each particle
6. Occupancy volumes (where each voxel contains particle ID of the particle (w.r.t. text file) or 0 if that’s not a particle)
7. Class mask volumes (where each voxel contains class ID of the particle (w.r.t. text file) or 0 if that's not a particle)

Dataset also includes Python code examples of data loading and a README file with more detailed information.
**Contest** dataset has 9 annotated tomograms and 1 test tomogram.
**Full** dataset has 10 annotated tomograms.
**Diff** dataset contains only the difference between full and contest dataset.