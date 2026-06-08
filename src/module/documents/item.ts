export class Dos100Item extends Item {
  override prepareBaseData(): void {
    super.prepareBaseData();
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    switch (this.type) {
      case "trait":
        this.#prepareTraitData();
        break;
    }
  }

  #prepareTraitData(): void {}
}
