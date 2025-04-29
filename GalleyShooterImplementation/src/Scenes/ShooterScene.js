"use strict";

class ShooterScene extends Phaser.Scene {
    constructor() {
        super("shooterScene");

        this.my = { sprite: {}, group: {} };
        this.baseX = 320;  // centered for 640 width
        this.baseY = 550;
        this.bulletSpeed = 12;
        this.spawnTimer = 0;
        this.score = 0;
        this.health = 3;
    }

    preload() {
        this.load.setPath("./assets/");
        this.load.image("player", "whale.png");
        this.load.image("bullet", "shot_grey_large.png");
        this.load.image("alienBeige", "alienBeige.png");
        this.load.image("alienBlue", "alienBlue.png");
        this.load.image("alienPink", "alienPink.png");
    }
    

    create() {
        let my = this.my;

        // Player setup
        my.sprite.avatar = this.physics.add.sprite(this.baseX, this.baseY, "player");
        my.sprite.avatar.setCollideWorldBounds(true);

        // Groups for bullets and enemies
        my.group.bullets = this.physics.add.group();
        my.group.enemies = this.physics.add.group();

        // Keyboard input
        this.keys = this.input.keyboard.addKeys({
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            shoot: Phaser.Input.Keyboard.KeyCodes.SPACE
        });

        // Score + Health UI
        this.scoreText = this.add.text(10, 10, "Score: 0", { fontSize: "20px", fill: "#fff" });
        this.healthText = this.add.text(10, 40, "Health: 3", { fontSize: "20px", fill: "#fff" });

        // Collisions
        this.physics.add.overlap(my.group.bullets, my.group.enemies, this.bulletHitsEnemy, null, this);
        this.physics.add.overlap(my.sprite.avatar, my.group.enemies, this.enemyHitsPlayer, null, this);
    }

    update() {
        let my = this.my;

        // Player Movement
        if (this.keys.left.isDown) {
            my.sprite.avatar.x -= 8;
        } else if (this.keys.right.isDown) {
            my.sprite.avatar.x += 8;
        }

        // Shooting
        if (Phaser.Input.Keyboard.JustDown(this.keys.shoot)) {
            let bullet = my.group.bullets.create(
                my.sprite.avatar.x,
                my.sprite.avatar.y - 20,
                "bullet"
            );
            bullet.setVelocityY(-this.bulletSpeed * 30);
        }

        // Spawn enemies every 1.5 seconds
        this.spawnTimer += 1;
        if (this.spawnTimer > 90) {
            this.spawnEnemy();
            this.spawnTimer = 0;
        }
    }

    spawnEnemy() {
        const enemyTypes = ["alienBeige", "alienBlue", "alienPink"];
        const type = Phaser.Utils.Array.GetRandom(enemyTypes);
        let x = Phaser.Math.Between(50, 590);
        let enemy = this.my.group.enemies.create(x, 0, type);
        enemy.setVelocityY(100);
    }

    bulletHitsEnemy(bullet, enemy) {
        bullet.destroy();
        enemy.destroy();
        this.score += 10;
        this.scoreText.setText("Score: " + this.score);
    }

    enemyHitsPlayer(player, enemy) {
        enemy.destroy();
        this.health -= 1;
        this.healthText.setText("Health: " + this.health);
        if (this.health <= 0) {
            this.scene.restart();
        }
    }
}

window.ShooterScene = ShooterScene;
