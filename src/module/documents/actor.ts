export class Dos100Actor extends Actor {
  override prepareBaseData(): void {
    super.prepareBaseData();
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    switch (this.type) {
      case "pc":
        this._preparePcData();
        break;
      case "npc":
        this._prepareNpcData();
        break;
      case "vehicle":
        this._prepareVehicleData();
        break;
    }
  }

  protected _preparePcData(): void {}
  protected _prepareNpcData(): void {}
  protected _prepareVehicleData(): void {}
}
