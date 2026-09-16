# Challenges

GraphChallenge seeks input from diverse communities to develop graph challenges that take the best of what has been learned from groundbreaking efforts such as [GraphAnalysis](http://graphanalysis.org/benchmark/index.html), [Graph500](http://graph500.org/), [FireHose](http://firehose.sandia.gov/), [MiniTri](http://mantevo.org/), and [GraphBLAS](http://graphblas.org/) to create a new set of challenges to move the community forward.

[NEW] **Sparse Deep Neural Network Graph Challenge** This challenge performs neural network inference on a variety of sparse deep neural networks.

- Specification: [slides](https://graphchallenge.mit.edu/sites/default/files/documents/SparseDNN-GraphChallenge-2019-09-01.pdf), [paper](https://arxiv.org/pdf/1909.05631), [example serial code](https://github.com/graphchallenge/GraphChallenge/tree/master/SparseDeepNeuralNetwork), [example data sets](http://graphchallenge.mit.edu/data-sets)

**Static Graph Challenge: Subgraph Isomorphism** This challenge seeks to identify a given sub-graph in a larger graph.

- Specification: [slides](https://graphchallenge.mit.edu/sites/default/files/documents/SubGraphChallenge-2017-02-09.pdf), [paper](https://arxiv.org/abs/1708.06866), [example serial code](http://github.com/graphchallenge/GraphChallenge/tree/master/SubgraphIsomorphism), [example data sets](http://graphchallenge.mit.edu/data-sets#SNAPDatasets), [Amazon instructions](https://graphchallenge.mit.edu/running-sample-code-amazon-ec2)

**Streaming Graph Challenge: Stochastic Block Partition** This challenge seeks to identify optimal blocks (or clusters) in a larger graph.

- Specification: [slides](https://graphchallenge.mit.edu/sites/default/files/documents/GraphPartitionChallenge-2017-03-27.pdf), [paper](https://arxiv.org/abs/1708.07883), [example serial code](https://github.com/graphchallenge/GraphChallenge/tree/master/StochasticBlockPartition), [example data sets](http://graphchallenge.mit.edu/data-sets#PartitionDatasets), [Amazon instructions](https://graphchallenge.mit.edu/running-sample-code-amazon-ec2)

Note on static versus streaming graph challenges. In static processing, given a large graph G the goal is to evaluate a function f(G). In stateless streaming, given an additional smaller graph g, the goal is to evaluate the function f(g). In stateful streaming, the goal is to evaluate a function f(G + g). Stateful streaming is the focus of the streaming graph challenge.

Please use the following archival citations for the Graph Challenge when using the datasets and/or implementations made available via this Challenge:

[*Sparse Deep Neural Network Graph Challenge*](https://doi.org/10.1109/HPEC.2019.8916336), Jeremy Kepner, Simon Alford, Vijay Gadepally, Michael Jones, Lauren Milechin, Ryan Robinett, Sid Samsi, IEEE HPEC, 2019

*[Static Graph Challenge: Subgraph Isomorphism](https://doi.org/10.1109/HPEC.2017.8091039),* Siddharth Samsi, Vijay Gadepally, Michael Hurley, Michael Jones, Edward Kao, Sanjeev Mohindra, Paul Monticciolo, Albert Reuther, Steven Smith, William Song, Diane Staheli, Jeremy Kepner, IEEE HPEC, 2017

*[Streaming Graph Challenge: Stochastic Block Partition](https://doi.org/10.1109/HPEC.2017.8091040),* Edward Kao, Vijay Gadepally, Michael Hurley, Michael Jones, Jeremy Kepner, Sanjeev Mohindra, Paul Monticciolo, Albert Reuther, Siddharth Samsi, William Song, Diane Staheli, Steven Smith, IEEE HPEC, 2017

[*PageRank Pipeline Benchmark: Proposal for a Holistic System Benchmark for Big-Data Platforms*](https://doi.org/10.1109/IPDPSW.2016.89), Patrick Dreher, Chansup Byun, Chris Hill, Vijay Gadepally, Bradley Kuszmaul, Jeremy Kepner, IEEE IPDPSW, 2016