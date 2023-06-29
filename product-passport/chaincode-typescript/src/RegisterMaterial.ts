 @Transaction()
 public async RegisterMaterial(
   ctx: Context,
   id: string,
   materialName: string,
   producer: string,
   appraisedValue: number
 ): Promise<void> {
   const exists = await this.MaterialExists(ctx, id);
   if (exists) {
     throw new Error(`The material ${id} already exists`);
   }

   const material: Material = {
     ...
   };

   await ctx.stub.putState(
     id,
     Buffer.from(stringify(sortKeysRecursive(material)))
   );
 }

 @Transaction(false)
  @Returns("boolean")
  public async MaterialExists(
    ctx: Context, 
    id: string
    ): Promise<boolean> {
    const assetJSON = await ctx.stub.getState(id);
    return assetJSON && assetJSON.length > 0;
  }