/*
  SPDX-License-Identifier: Apache-2.0
*/

import { Object, Property } from "fabric-contract-api";

@Object()
export class Product {
  @Property()
  public docType?: string;

  @Property()
  public ID: string;

  @Property()
  public ProductName: string;

  @Property()
  public Manufacturer: string;

  @Property()
  public Owner: string;

  @Property()
  public AppraisedValue: number;

  @Property()
  public Recycled: boolean;

  @Property()
  public Materials: string[];

  @Property()
  public ApprovalRequests: string[];

  @Property()
  public ApprovedEntities: string[];
}

@Object()
export class Material {
  @Property()
  public docType?: string;

  @Property()
  public ID: string;

  @Property()
  public MaterialName: string;

  @Property()
  public Producer: string;

  @Property()
  public Seller: string;

  @Property()
  public AppraisedValue: number;

  @Property()
  public Recycled: boolean;
}
