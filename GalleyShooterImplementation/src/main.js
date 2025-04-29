"use strict";

// game config
let config = {
    parent: 'phaser-game',
    type: Phaser.CANVAS,
    render: {
        pixelArt: true  // prevent pixel art from getting blurred when scaled
    },
    width: 640,         // 10 tiles, each 16 pixels, scaled 4x
    height: 640,
    
    //PHYSICS
    physics: {
        default: 'arcade',
        arcade: {
            debug: false  // set to true if you want to see hitboxes
        }
    },

    scene: [TinyTown, ShooterScene]
};


const game = new Phaser.Game(config);
