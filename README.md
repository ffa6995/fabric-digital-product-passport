[//]: # "SPDX-License-Identifier: CC-BY-4.0"

# Hyperledger Fabric Digital Product Passport

## Getting started with the Fabric Digital Product Passport

To use the Fabric Digital Product Passport, you need to download the Fabric Docker images and the Fabric CLI tools. First, make sure that you have installed all of the [Fabric prerequisites](https://hyperledger-fabric.readthedocs.io/en/latest/prereqs.html). You can then follow the instructions to [Install the Fabric Samples, Binaries, and Docker Images](https://hyperledger-fabric.readthedocs.io/en/latest/install.html) in the Fabric documentation. In addition to downloading the Fabric images and tool binaries, the Fabric samples will also be cloned to your local machine.

First get the install script:
```
curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh && chmod +x install-fabric.sh
```

Then pull the docker containers and the binaries
```
./install-fabric.sh docker binary
```

Default fabric version is always the latest version, but it can also be set by running this command (for example for version 2.5.0 - which is the version this project was developed):
```
./install-fabric.sh --fabric-version 2.5.0 binary
```

## Test network

The [Fabric test network](test-network) in the test network folder provides a Docker Compose based test network with two
Organization peers and an ordering service node. You can use it on your local machine to run the samples listed below.
You can also use it to deploy and test your own Fabric chaincodes and applications. To get started, see
the [test network tutorial](https://hyperledger-fabric.readthedocs.io/en/latest/test_network.html).

# Digital Product Passport Prototype

## Run the test network

To test the application you first have to run the test network. Instructions are also in the [test network tutorial](https://hyperledger-fabric.readthedocs.io/en/release-2.5/test_network.html).

```
cd test-network
```

With the `network.sh` script the network can be started.

```
./network.sh down
```

to remove any container or artifact from previous runs

```
./network.sh up
```

to bring up the network together with its peers and orderer nodes.

Then a channel has to be created for the communication between the organizations.

```
./network.sh createChannel
```

this creates a channel with the name 'mychannel'

After that you have to install the chaincode on the channel and define where the privata data collection defintion is located:

```
./network.sh deployCC -ccn private -ccp ../asset-transfer-private-data/chaincode-go/ -ccl go -ccep "OR('Org1MSP.peer','Org2MSP.peer')" -cccg ../asset-transfer-private-data/chaincode-go/collections_config.json
```

## Interacting with the network and chaincode

To interact with the test network and chaincode the peer CLI can be used.
To use it the binaries have to be set as well as the fabric cfg path to point to the core.yaml

```
export PATH=${PWD}/../bin:$PATH
```

```
export FABRIC_CFG_PATH=$PWD/../config/
```

When operating as Organisation 1 the environment variables can be set to the following:

## Environment variables for Org1

```
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051
```

To initialize the initial data call the ``InitLedger`` function which registers some sample products and materials to the blockchain.

```
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" -C mychannel -n private --peerAddresses localhost:7051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" --peerAddresses localhost:9051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" -c '{"function":"InitLedger","Args":[]}'
```

Depending on which function you want to call the function field has to be set with the function name you want to call.


## License <a name="license"></a>

Hyperledger Project source code files are made available under the Apache
License, Version 2.0 (Apache-2.0), located in the [LICENSE](LICENSE) file.
Hyperledger Project documentation files are made available under the Creative
Commons Attribution 4.0 International License (CC-BY-4.0), available at http://creativecommons.org/licenses/by/4.0/.
