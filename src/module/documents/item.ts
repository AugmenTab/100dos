export class Dos100Item extends Item {
  override prepareBaseData(): void {
    super.prepareBaseData();
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    switch (this.type) {
      case "ability":
        this._prepareAbilityData();
        break;
      case "trait":
        this._prepareTraitData();
        break;
    }
  }

  protected _prepareAbilityData(): void {}
  protected _prepareTraitData(): void {}
}
