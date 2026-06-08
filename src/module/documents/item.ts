export class Dos100Item extends Item {
  override prepareBaseData(): void {
    super.prepareBaseData();
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    switch (this.type) {
      case "ability":
        this.#prepareAbilityData();
        break;
      case "trait":
        this.#prepareTraitData();
        break;
    }
  }

  #prepareAbilityData(): void {}
  #prepareTraitData(): void {}
}
