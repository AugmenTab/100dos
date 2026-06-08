const { StringField } = foundry.data.fields;

export type TraitData = {
  description: string;
};

export class TraitDataModel extends foundry.abstract.TypeDataModel {
  static override defineSchema() {
    return {
      description: new StringField({ required: true, initial: "" }),
    };
  }
}
