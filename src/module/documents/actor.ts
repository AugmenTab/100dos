export class Dos100Actor extends Actor {
  override prepareBaseData(): void {
    super.prepareBaseData();
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    switch (this.type) {
      case "pc":
        this.#preparePcData();
        break;
      case "npc":
        this.#prepareNpcData();
        break;
      case "vehicle":
        this.#prepareVehicleData();
        break;
    }
  }

  #preparePcData(): void {}
  #prepareNpcData(): void {}
  #prepareVehicleData(): void {}
}
