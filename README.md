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
./network.sh deployCC -ccn private -ccp ../product-passport/chaincode-typescript -ccl typescript -ccep "OR('Org1MSP.peer','Org2MSP.peer')" -cccg ./collections_config.json
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

## Environment variables for Org2
When operating as Organisation 2 the environment variables can be set to the following
```
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051
```

To initialize the initial data call the ``InitLedger`` function which registers some sample products and materials to the blockchain.

```
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" -C mychannel -n private --peerAddresses localhost:7051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" --peerAddresses localhost:9051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" -c '{"function":"InitLedger","Args":[]}'
```

Depending on which function you want to call the function field has to be set with the function name you want to call.

## Read Material Of Product

A function with arguments is called like in the following example.
The example shows the ``ReadMaterialsOfProduct`` function which takes the ``ID`` of the product as argument. The argument is passed in quotes to the ``"Args":[]"`` of the function call. In this case ``"product1"``:
```
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" -C mychannel -n private --peerAddresses localhost:7051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" --peerAddresses localhost:9051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" -c '{"function":"ReadMaterialsOfProduct","Args":["product1"]}'
```

If there is an error the response will write the error together with the error message in the terminal. For instance, here the caller does not have enough permissions to request private material data:
```
Error: endorsement failure during invoke. response: status:500 message:"Access denied. Caller does not have permission to read materials of product product1" 
```
If succesful the response will look something like this, where instead of the hashes, the whole material data is displayed:

```
2023-07-05 15:24:13.461 CEST 0001 INFO [chaincodeCmd] chaincodeInvokeOrQuery -> Chaincode invoke successful. result: status:200 payload:"[\"{\\\"docType\\\":\\\"material\\\",\\\"ID\\\":\\\"material1\\\",\\\"MaterialName\\\":\\\"Material 1\\\",\\\"Producer\\\":\\\"Producer 1\\\",\\\"AppraisedValue\\\":100,\\\"Seller\\\":\\\"Producer 1\\\",\\\"Recycled\\\":false}\",\"{\\\"docType\\\":\\\"material\\\",\\\"ID\\\":\\\"material2\\\",\\\"MaterialName\\\":\\\"Material 2\\\",\\\"Producer\\\":\\\"Producer 2\\\",\\\"AppraisedValue\\\":200,\\\"Seller\\\":\\\"Producer 2\\\",\\\"Recycled\\\":false}\"]" 
```

## Request Access to Materials of Product
To request acces to the materials of a product the ```RequestAccess``` function can be called. This function requests access for the caller. The function can be called like the following:

```
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" -C mychannel -n private --peerAddresses localhost:7051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" --peerAddresses localhost:9051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" -c '{"function":"RequestAccess","Args":["product1"]}'
```

The ``Manufacturer`` of the product, which is ``Org1`` in this example, can then either approve or reject the request by calling the ``approveAccessForRequestID`` function. In this example the request for ``product1`` for ``Org2MSP`` is approved by setting the approval to ``true``:

```
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" -C mychannel -n private --peerAddresses localhost:7051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" --peerAddresses localhost:9051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" -c '{"function":"approveAccessForRequestID","Args":["product1", "Org2MSP", "true"]}'
```

## Recycle Product
When a product is recycled the ``RecycleAndOffer`` function can be called to mark a product as ``Recycled`` and to register the materials as new ``Recycled`` ``Material`` objects on the blockchain.

```
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" -C mychannel -n private --peerAddresses localhost:7051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" --peerAddresses localhost:9051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" -c '{"function":"RecycleAndOffer","Args":["product1"]}'
```

After the recycling process the recycled materials get registered on the blockchain as ``Recycled`` materials, that material producers can query for and then buy back with the given information:

```
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" -C mychannel -n private --peerAddresses localhost:7051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" --peerAddresses localhost:9051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" -c '{"function":"GetMaterialInformation","Args":["material1RECYCLED"]}'
```
The response shows, who is the ``Seller`` of the recycled procut:
```
Chaincode invoke successful. result: status:200 payload:"{\"AppraisedValue\":100,\"ID\":\"material1RECYCLED\",\"MaterialName\":\"Material 1\",\"Producer\":\"Producer 1\",\"Recycled\":true,\"Seller\":\"Org2MSP\",\"docType\":\"material\"}" 
```

## License <a name="license"></a>

Hyperledger Project source code files are made available under the Apache
License, Version 2.0 (Apache-2.0), located in the [LICENSE](LICENSE) file.
Hyperledger Project documentation files are made available under the Creative
Commons Attribution 4.0 International License (CC-BY-4.0), available at http://creativecommons.org/licenses/by/4.0/.
