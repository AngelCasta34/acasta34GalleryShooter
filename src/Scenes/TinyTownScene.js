class TinyTown extends Phaser.Scene { 
    constructor() {
        super("tinyTown");
    }

    preload() {
        this.load.setPath("./assets/");
        this.load.image("tiny_town_tiles", "kenny-tiny-town-tilemap-packed.png");    
        this.load.tilemapTiledJSON("map", "TinyTownMap.json");                   
    }

    create() {
        this.map = this.add.tilemap("map", 16, 16, 10, 10);
        this.tileset = this.map.addTilesetImage("tiny-town-packed", "tiny_town_tiles");

        // Replace these with your real layer names from the Tiled map
        this.grassLayer = this.map.createLayer("Grass-n-Houses", this.tileset, 0, 0);
        this.grassLayer.setScale(4.0);

        // Optional second layer (only if it exists)
        this.treeLayer = this.map.createLayer("Tree-n-Fences", this.tileset, 0, 0);
        if (this.treeLayer) this.treeLayer.setScale(4.0);

        // Show instructions
        document.getElementById('description').innerHTML = '<h2>Welcome to Tiny Town<br>Press ENTER to start!</h2>';

        // Add keyboard input for ENTER
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    }

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
            this.scene.start("shooterScene");
        }
    }
}

window.TinyTown = TinyTown;
