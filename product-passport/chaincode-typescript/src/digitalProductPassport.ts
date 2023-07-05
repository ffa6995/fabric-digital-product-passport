/*
 * SPDX-License-Identifier: Apache-2.0
 */
// Deterministic JSON.stringify()
import {
  Context,
  Contract,
  Info,
  Returns,
  Transaction,
} from "fabric-contract-api";
import stringify from "json-stringify-deterministic";
import sortKeysRecursive from "sort-keys-recursive";
import { Product, Material } from "./product";
import { createHash } from "crypto";

@Info({
  title: "DigitalProductPassport",
  description: "Smart contract for a digital product passport",
})
export class ProductTransferContract extends Contract {
  constructor() {
    // set unique contract namespace
    super("org.ppn.ProductPassportContract");
  }

  @Transaction()
  public async InitLedger(ctx: Context): Promise<void> {
    // Mock some materials
    const material1: Material = {
      docType: "material",
      ID: "material1",
      MaterialName: "Material 1",
      Producer: "Producer 1",
      AppraisedValue: 100,
      Seller: "Producer 1",
      Recycled: false,
    };

    const material2: Material = {
      docType: "material",
      ID: "material2",
      MaterialName: "Material 2",
      Producer: "Producer 2",
      AppraisedValue: 200,
      Seller: "Producer 2",
      Recycled: false,
    };

    // Mock products
    const product1: Product = {
      docType: "product",
      ID: "product1",
      ProductName: "Product 1",
      Manufacturer: ctx.clientIdentity.getMSPID(),
      Owner: ctx.clientIdentity.getMSPID(),
      AppraisedValue: 1000,
      Materials: [],
      Recycled: false,
      ApprovalRequests: [],
      ApprovedEntities: [],
    };

    const product2: Product = {
      docType: "product",
      ID: "product2",
      ProductName: "Product 2",
      Manufacturer: ctx.clientIdentity.getMSPID(),
      Owner: ctx.clientIdentity.getMSPID(),
      AppraisedValue: 2000,
      Materials: [],
      Recycled: false,
      ApprovalRequests: [],
      ApprovedEntities: [],
    };

    // Add the materials and products to arrays
    const materials: Material[] = [material1, material2];
    const products: Product[] = [product1, product2];

    // save material data on blockchain
    for (const material of materials) {
      await ctx.stub.putState(
        material.ID,
        Buffer.from(stringify(sortKeysRecursive(material)))
      );
      console.info(`Material ${material.ID} initialized`);
    }

    // hash materials data to save on blockchain
    const hashedMaterials = materials.map((material) =>
      this.hashMaterial(material)
    );

    const privateDataCollection = "privateMaterialsCollection"; // Private data collection name

    // Store the original materials as private data
    for (const material of materials) {
      const materialKey = this.generateMaterialKey(material);
      await ctx.stub.putPrivateData(
        privateDataCollection,
        materialKey,
        Buffer.from(JSON.stringify(material))
      );
    }

    // save products with hashed materials to keep material composition private
    for (const product of products) {
      product.docType = "product";
      product.Materials = hashedMaterials;
      await ctx.stub.putState(
        product.ID,
        Buffer.from(stringify(sortKeysRecursive(product)))
      );
      console.info(`Product ${product.ID} initialized`);
    }
  }

  // RegisterProduct issues a new product to the world state with given details.
  @Transaction()
  public async RegisterProduct(
    ctx: Context,
    id: string,
    productName: string,
    manufacturer: string,
    owner: string,
    appraisedValue: number,
    materials: Material[]
  ): Promise<void> {
    const exists = await this.ProductExists(ctx, id);
    if (exists) {
      throw new Error(`The asset ${id} already exists`);
    }
    const privateDataCollection = "privateMaterialsCollection"; // Private data collection name

    // Store the original materials as private data and check if they exist on the network.
    for (const material of materials) {
      const exists = await this.MaterialExists(ctx, id);
      if (!exists) {
        throw new Error(`The material ${id} does not exist on the network.
        Please contact your material producer to register the material`);
      }
      const materialKey = this.generateMaterialKey(material);
      await ctx.stub.putPrivateData(
        privateDataCollection,
        materialKey,
        Buffer.from(JSON.stringify(material))
      );
    }

    const hashedMaterials = materials.map((material) =>
      this.hashMaterial(material)
    );

    const product: Product = {
      ID: id,
      ProductName: productName,
      Manufacturer: manufacturer,
      Owner: owner,
      AppraisedValue: appraisedValue,
      Materials: hashedMaterials,
      Recycled: false,
      ApprovalRequests: [],
      ApprovedEntities: [],
    };
    // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
    await ctx.stub.putState(
      id,
      Buffer.from(stringify(sortKeysRecursive(product)))
    );
  }

  // RegisterMaterial issues a new material to the world state with given details.
  @Transaction()
  public async RegisterMaterial(
    ctx: Context,
    id: string,
    materialName: string,
    producer: string,
    appraisedValue: number,
    seller: string,
    recycled: boolean
  ): Promise<void> {
    const exists = await this.MaterialExists(ctx, id);
    if (exists) {
      throw new Error(`The material ${id} already exists`);
    }

    const material: Material = {
      docType: "material",
      ID: id,
      MaterialName: materialName,
      Producer: producer,
      AppraisedValue: appraisedValue,
      Seller: seller,
      Recycled: recycled,
    };

    // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
    await ctx.stub.putState(
      id,
      Buffer.from(stringify(sortKeysRecursive(material)))
    );
  }

  // ReadProduct returns the product stored in the world state with given id.
  @Transaction(false)
  public async ReadProductOrMaterialById(
    ctx: Context,
    id: string
  ): Promise<string> {
    const assetJSON = await ctx.stub.getState(id); // get the asset from chaincode state
    if (!assetJSON || assetJSON.length === 0) {
      throw new Error(`The asset ${id} does not exist`);
    }
    return assetJSON.toString();
  }

  // GetMaterialInformation returns a specific material by the given id and returns
  // the information of the requested material
  @Transaction(false)
  public async GetMaterialInformation(
    ctx: Context,
    materialId: string
  ): Promise<Material> {
    const materialDataBytes = await ctx.stub.getState(materialId);
    if (!materialDataBytes || materialDataBytes.length === 0) {
      throw new Error(`The material with key ${materialId} does not exist`);
    }
    const materialData: Material = JSON.parse(materialDataBytes.toString());
    return materialData;
  }

  // ReadMaterialsOfProduct returns the material of the given product id which is private data
  // and only return the data if the caller has permissions.
  @Transaction(false)
  public async ReadMaterialsOfProduct(
    ctx: Context,
    id: string
  ): Promise<string[]> {
    const privateDataCollection = "privateMaterialsCollection"; // Private data collection name

    // Get the product data from the chaincode state
    const productDataBytes = await ctx.stub.getState(id);
    if (!productDataBytes || productDataBytes.length === 0) {
      throw new Error(`The product with key ${id} does not exist`);
    }
    const productData: Product = JSON.parse(productDataBytes.toString());

    // Check if the caller is the owner of the product or in the ApproveEntities array
    const callerMSPID = ctx.clientIdentity.getMSPID();
    const isManufacturer = callerMSPID === productData.Manufacturer;
    const isInApproveEntities =
      productData.ApprovedEntities.includes(callerMSPID);
    if (!isManufacturer && !isInApproveEntities) {
      throw new Error(
        `Access denied. Caller: "${callerMSPID}" does not have permission to read materials of product ${id}.`
      );
    }

    // Retrieve private material data from the specified collection
    var privateData: string[] = [];
    for (const material of productData.Materials) {
      privateData.push(
        (
          await ctx.stub.getPrivateData(privateDataCollection, material)
        ).toString()
      );
    }
    return privateData;
  }

  @Transaction()
  public async RecycleAndOffer(ctx: Context, productId: string): Promise<void> {
    const privateDataCollection = "privateMaterialsCollection"; // Private data collection name
    const exists = await this.ProductExists(ctx, productId);
    if (!exists) {
      throw new Error(`The asset ${productId} does not exist`);
    }
    const productBytes: Uint8Array = await ctx.stub.getState(productId);
    let product: Product = JSON.parse(productBytes.toString()) as Product;

    // Check if the caller is the owner of the product or in the ApproveEntities array
    const callerMSPID = ctx.clientIdentity.getMSPID();
    const isManufacturer = callerMSPID === product.Manufacturer;
    const isInApproveEntities = product.ApprovedEntities.includes(callerMSPID);
    if (!isManufacturer && !isInApproveEntities) {
      throw new Error(
        `Access denied. Caller does not have permission to read materials of product ${productId}`
      );
    }

    product.Recycled = true;

    // Retrieve private material data from the specified collection
    for (const material of product.Materials) {
      const materialBytes: Uint8Array = await ctx.stub.getPrivateData(
        privateDataCollection,
        material
      );
      let recycledMaterial: Material = JSON.parse(
        materialBytes.toString()
      ) as Material;
      recycledMaterial.Recycled = true;
      recycledMaterial.Seller = callerMSPID;
      recycledMaterial.ID = recycledMaterial.ID + "RECYCLED";
      this.RegisterMaterial(
        ctx,
        recycledMaterial.ID,
        recycledMaterial.MaterialName,
        recycledMaterial.Producer,
        recycledMaterial.AppraisedValue,
        recycledMaterial.Seller,
        recycledMaterial.Recycled
      );
    }

    return ctx.stub.putState(
      productId,
      Buffer.from(stringify(sortKeysRecursive(product)))
    );
  }

  // UpdateProduct updates an existing product in the world state with provided parameters.
  @Transaction()
  public async UpdateProduct(
    ctx: Context,
    id: string,
    color: string,
    size: number,
    owner: string,
    appraisedValue: number
  ): Promise<void> {
    const exists = await this.ProductExists(ctx, id);
    if (!exists) {
      throw new Error(`The asset ${id} does not exist`);
    }

    // overwriting original product with new product
    const updatedAsset = {
      ID: id,
      Color: color,
      Size: size,
      Owner: owner,
      AppraisedValue: appraisedValue,
    };
    // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
    return ctx.stub.putState(
      id,
      Buffer.from(stringify(sortKeysRecursive(updatedAsset)))
    );
  }

  // DeleteProduct deletes an given product from the world state.
  @Transaction()
  public async DeleteProduct(ctx: Context, id: string): Promise<void> {
    const exists = await this.ProductExists(ctx, id);
    if (!exists) {
      throw new Error(`The product with ${id} does not exist`);
    }
    return ctx.stub.deleteState(id);
  }

  // ProcutExists returns true when product with given ID exists in world state.
  @Transaction(false)
  @Returns("boolean")
  public async ProductExists(ctx: Context, id: string): Promise<boolean> {
    const assetJSON = await ctx.stub.getState(id);
    return assetJSON && assetJSON.length > 0;
  }

  // MaterialExists returns true when material with given ID exists in world state.
  @Transaction(false)
  @Returns("boolean")
  public async MaterialExists(ctx: Context, id: string): Promise<boolean> {
    const assetJSON = await ctx.stub.getState(id);
    return assetJSON && assetJSON.length > 0;
  }

  // TransferProduct updates the owner field of product with given id in the world state, and returns the old owner.
  @Transaction()
  public async TransferProduct(
    ctx: Context,
    id: string,
    newOwner: string
  ): Promise<string> {
    const assetString = await this.ReadProductOrMaterialById(ctx, id);
    const asset = JSON.parse(assetString);
    const oldOwner = asset.Owner;
    asset.Owner = newOwner;
    // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
    await ctx.stub.putState(
      id,
      Buffer.from(stringify(sortKeysRecursive(asset)))
    );
    return oldOwner;
  }

  // GetAllProducts returns all assets found in the world state.
  @Transaction(false)
  @Returns("string")
  public async GetAllProducts(ctx: Context): Promise<string> {
    const allResults = [];
    // range query with empty string for startKey and endKey does an open-ended query of all products in the chaincode namespace.
    const iterator = await ctx.stub.getStateByRange("", "");
    let result = await iterator.next();
    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString(
        "utf8"
      );
      let record;
      try {
        record = JSON.parse(strValue);
      } catch (err) {
        console.log(err);
        record = strValue;
      }
      allResults.push(record);
      result = await iterator.next();
    }
    return JSON.stringify(allResults);
  }

  // RequestAccess requests access to a specific product for the caller of the function.
  @Transaction()
  @Returns("string")
  public async RequestAccess(
    ctx: Context,
    productKey: string
  ): Promise<string> {
    // Retrieve the product from public data
    const productData = await ctx.stub.getState(productKey);

    // get the caller id of the function
    const callerID = ctx.clientIdentity.getMSPID();

    if (!productData || productData.length === 0) {
      throw new Error(`Product with key ${productKey} does not exist`);
    }

    const product: Product = JSON.parse(productData.toString());

    // Check if the caller is the owner
    if (callerID === product.Manufacturer) {
      throw new Error(
        "Manufacturer cannot request access, because he already has access"
      );
    }

    // Check if the caller has already access to the data
    if (
      product.ApprovedEntities &&
      product.ApprovedEntities.includes(callerID)
    ) {
      throw new Error(
        `Caller with id ${callerID} already has access to the data`
      );
    }

    // Check if the caller has already requested access
    if (
      product.ApprovalRequests &&
      product.ApprovalRequests.includes(callerID)
    ) {
      throw new Error("Access request already submitted");
    }

    // Add the caller to the approval requests
    product.ApprovalRequests = product.ApprovalRequests || [];
    product.ApprovalRequests.push(callerID);

    // Store the updated product
    await ctx.stub.putState(productKey, Buffer.from(JSON.stringify(product)));

    return "Access request submitted by " + callerID;
  }

  // approve all the access requests that are done to a specific product
  @Transaction()
  @Returns("string")
  public async approveAllAccessRequests(
    ctx: Context,
    productKey: string
  ): Promise<string> {
    // Retrieve the product from public data
    const productData = await ctx.stub.getState(productKey);

    // get the caller id of the function
    const callerID = ctx.clientIdentity.getMSPID();

    if (!productData || productData.length === 0) {
      throw new Error(`Product with key ${productKey} does not exist`);
    }

    const product: Product = JSON.parse(productData.toString());

    // Check if the caller is the manufacturer
    if (callerID !== product.Manufacturer) {
      throw new Error("Only the manufacturer can approve access");
    }

    // Check if there are pending access requests
    if (!product.ApprovalRequests || product.ApprovalRequests.length === 0) {
      throw new Error("No pending access requests");
    }

    // Approve access requests from other organizations
    const approvedRequests: string[] = [];
    for (const request of product.ApprovalRequests) {
      if (request !== callerID) {
        approvedRequests.push(request);
      }
    }

    if (approvedRequests.length === 0) {
      throw new Error("No access requests from other organizations");
    }

    // Add approved entities to the list
    product.ApprovedEntities = product.ApprovedEntities || [];
    product.ApprovedEntities.push(...approvedRequests);

    // Remove approved entities from the approval requests
    product.ApprovalRequests = product.ApprovalRequests.filter(
      (request: string) => !approvedRequests.includes(request)
    );

    // Store the updated product
    await ctx.stub.putState(productKey, Buffer.from(JSON.stringify(product)));

    return "Access requests approved";
  }

  // approve access to view private data for the given requestID
  @Transaction()
  @Returns("string")
  public async approveAccessForRequestID(
    ctx: Context,
    productKey: string,
    requestID: string,
    approve: boolean
  ): Promise<string> {
    // Retrieve the product from public data
    const productData = await ctx.stub.getState(productKey);

    // get the caller id of the function
    const callerID = ctx.clientIdentity.getMSPID();

    if (!productData || productData.length === 0) {
      throw new Error(`Product with key ${productKey} does not exist`);
    }

    const product: Product = JSON.parse(productData.toString());

    // Check if the caller is the manufacturer
    if (callerID !== product.Manufacturer) {
      throw new Error("Only the manufacturer can approve access");
    }

    // Check if the requestID exists in the approval requests
    if (
      !product.ApprovalRequests ||
      !product.ApprovalRequests.includes(requestID)
    ) {
      throw new Error("The specified request ID is not found");
    }

    if (approve) {
      // Add the requestID to the approved entities
      product.ApprovedEntities = product.ApprovedEntities || [];
      product.ApprovedEntities.push(requestID);
    }

    // Remove the requestID from the approval requests
    product.ApprovalRequests = product.ApprovalRequests.filter(
      (id: string) => id !== requestID
    );

    // Store the updated product
    await ctx.stub.putState(productKey, Buffer.from(JSON.stringify(product)));

    if (approve) {
      return "Access request approved";
    } else {
      return "Access request declined";
    }
  }

  private hashMaterial(material: Material): string {
    const materialString = JSON.stringify(material);
    return createHash("sha256").update(materialString).digest("hex");
  }

  private generateMaterialKey(material: Material): string {
    const materialString = JSON.stringify(material);
    return createHash("sha256").update(materialString).digest("hex");
  }
}
