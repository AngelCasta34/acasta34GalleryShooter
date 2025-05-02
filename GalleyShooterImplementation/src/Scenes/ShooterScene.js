"use strict";

// Main shooter game scene
class ShooterScene extends Phaser.Scene {
    constructor() {
        super("shooterScene");

        // Object containers for sprites and groups
        this.my = { sprite: {}, group: {} };

        // Player starting position
        this.baseX = 320;
        this.baseY = 550;

        // Bullet speed
        this.bulletSpeed = 12;

        // Boss-related variables
        this.boss = null;
        this.bossDirection = 1;
        this.bossHealth = 500;
        this.maxBossHealth = 500;
    }

    // Load assets (images, audio, tilemap)
    preload() {
        this.load.setPath("./assets/");
        this.load.tilemapTiledJSON("map", "TinyTownMap.json");
        this.load.image("tiny_town_tiles", "kenny-tiny-town-tilemap-packed.png");
        this.load.image("player_whale", "whale.png");
        this.load.image("player_ship", "ship_0000.png");
        this.load.image("bullet", "shot_grey_large.png");
        this.load.image("alienBeige", "alienBeige.png");
        this.load.image("alienBlue", "alienBlue.png");
        this.load.image("alienPink", "alienPink.png");
        this.load.image("boss", "shipPink_manned.png");
        this.load.image("meteor", "spaceMeteors_004.png");
        this.load.image("bossLaser", "tile_0006.png");
        this.load.image("whitePuff00", "whitePuff00.png");
        this.load.image("whitePuff01", "whitePuff01.png");
        this.load.image("whitePuff02", "whitePuff02.png");
        this.load.image("whitePuff03", "whitePuff03.png");

        // Load audio assets
        this.load.audio("bossDefeated", "thrusterFire_000.ogg");
        this.load.audio("bossLoop", "computerNoise_000.ogg");
    }

    // Initialize game objects
    create() {
        let my = this.my;

        // Initial player stats and game state
        this.score = 0;
        this.health = 3;
        this.level = 1;
        this.spawnTimer = 0;
        this.gameOver = false;

        // Load and scale map layers
        this.map = this.make.tilemap({ key: "map", tileWidth: 16, tileHeight: 16 });
        this.tileset = this.map.addTilesetImage("tiny-town-packed", "tiny_town_tiles");
        this.grassLayer = this.map.createLayer("Grass-n-Houses", this.tileset, 0, 0).setScale(4);
        this.treeLayer = this.map.createLayer("Tree-n-Fences", this.tileset, 0, 0).setScale(4);

        // Player setup
        my.sprite.avatar = this.physics.add.sprite(this.baseX, this.baseY, "player_whale").setScale(0.7);
        my.sprite.avatar.setCollideWorldBounds(true);

        // Create groups for bullets and enemies
        my.group.bullets = this.physics.add.group();
        my.group.enemies = this.physics.add.group();
        my.group.enemyBullets = this.physics.add.group();
        my.group.bossBullets = this.physics.add.group();

        // Keyboard input setup
        this.keys = this.input.keyboard.addKeys({
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            shoot: Phaser.Input.Keyboard.KeyCodes.SPACE,
            restart: Phaser.Input.Keyboard.KeyCodes.R
        });

        // On-screen text
        this.scoreText = this.add.text(10, 10, "Score: 0", { fontSize: "20px", fill: "#fff" });
        this.healthText = this.add.text(10, 40, "Health: 3", { fontSize: "20px", fill: "#fff" });
        this.winText = this.add.text(160, 280, "YOU WIN!", { fontSize: "48px", fill: "#0f0" }).setVisible(false);
        this.restartText = this.add.text(130, 350, "Press R to Restart", { fontSize: "32px", fill: "#0ff" }).setVisible(false);

        // Setup collision detection
        this.physics.add.overlap(my.group.bullets, my.group.enemies, this.bulletHitsEnemy, null, this);
        this.physics.add.overlap(my.sprite.avatar, my.group.enemies, this.enemyHitsPlayer, null, this);
        this.physics.add.overlap(my.sprite.avatar, my.group.enemyBullets, this.playerHitByBullet, null, this);
        this.physics.add.overlap(my.sprite.avatar, my.group.bossBullets, this.playerHitByBullet, null, this);

        // Explosion animation
        this.anims.create({
            key: "puff",
            frames: ["whitePuff00", "whitePuff01", "whitePuff02", "whitePuff03"].map(frame => ({ key: frame })),
            frameRate: 20,
            repeat: 0,
            hideOnComplete: true
        });
    }

    // Main game loop
    update() {
        if (this.gameOver) {
            if (Phaser.Input.Keyboard.JustDown(this.keys.restart)) this.scene.restart();
            return;
        }

        let my = this.my;

        // Player movement
        if (this.keys.left.isDown) my.sprite.avatar.x -= 8;
        else if (this.keys.right.isDown) my.sprite.avatar.x += 8;

        // Shooting
        if (Phaser.Input.Keyboard.JustDown(this.keys.shoot)) {
            let bullet = my.group.bullets.create(my.sprite.avatar.x, my.sprite.avatar.y - 20, "bullet");
            bullet.setVelocityY(-this.bulletSpeed * 30);
        }

        // Enemy spawning
        if (this.level <= 2 && ++this.spawnTimer > 90) {
            this.spawnEnemy();
            this.spawnTimer = 0;
        }

        // Level transitions
        if (this.level === 1 && this.score >= 100) this.level = 2;
        if (this.level === 2 && this.score >= 200) {
            this.level = 3;

            let { x, y } = this.my.sprite.avatar;
            this.my.sprite.avatar.destroy();
            this.my.sprite.avatar = this.physics.add.sprite(x, y, "player_ship").setScale(1.5).setCollideWorldBounds(true);
            this.my.sprite.avatar.body.setSize(this.my.sprite.avatar.width, this.my.sprite.avatar.height);

            this.my.group.enemies.clear(true, true);
            this.spawnBoss();
            this.physics.add.overlap(this.my.group.bullets, this.boss, this.bulletHitsBoss, null, this);
        }

        // Level 2: enemy projectile attacks
        if (this.level === 2) {
            my.group.enemies.children.iterate(enemy => {
                if (enemy && Phaser.Math.Between(0, 1500) < 1) {
                    let bullet = my.group.enemyBullets.create(enemy.x, enemy.y + 20, "meteor");
                    bullet.setScale(0.15);
                    this.physics.moveToObject(bullet, my.sprite.avatar, 150);
                }
            });
        }

        // Level 3: boss behavior
        if (this.level === 3 && this.boss) {
            this.boss.x += 3 * this.bossDirection;
            if (this.boss.x <= 50 || this.boss.x >= 590) this.bossDirection *= -1;

            if (Phaser.Math.Between(0, 100) < 2) this.fireBossLaser();

            this.bossHealthBar.clear();
            this.bossHealthBar.fillStyle(0xff0000, 1);
            this.bossHealthBar.fillRect(this.boss.x - 40, this.boss.y - 50, (this.bossHealth / this.maxBossHealth) * 80, 10);
        }
    }

    // Spawns a regular enemy
    spawnEnemy() {
        const type = Phaser.Utils.Array.GetRandom(["alienBeige", "alienBlue", "alienPink"]);
        let x = Phaser.Math.Between(50, 590);
        let y = this.level === 1 ? 0 : Phaser.Math.Between(50, 200);
        let enemy = this.my.group.enemies.create(x, y, type);
        enemy.setVelocityY(this.level === 1 ? 100 : 0);
    }

    // Spawns the boss and starts looped sound
    spawnBoss() {
        this.boss = this.physics.add.sprite(320, 100, "boss").setScale(1.0);
        this.boss.setCollideWorldBounds(true);
        this.boss.body.allowGravity = false;

        this.bossHealthBar = this.add.graphics();
        this.bossSound = this.sound.add("bossLoop", { loop: true, volume: 0.1 });
        this.bossSound.play();
    }

    // Fires a boss laser at the player
    fireBossLaser() {
        this.cameras.main.shake(50, 0.005);
        let laser = this.my.group.bossBullets.create(this.boss.x, this.boss.y + 40, "bossLaser");
        laser.setActive(true).setVisible(true);
        laser.body.setSize(laser.width, laser.height);
        this.physics.moveToObject(laser, this.my.sprite.avatar, 200);
    }

    // Handles bullet hitting a regular enemy
    bulletHitsEnemy(bullet, enemy) {
        bullet.destroy();
        enemy.destroy();
        this.add.sprite(enemy.x, enemy.y, "whitePuff00").setScale(0.5).play("puff");
        this.score += 10;
        this.scoreText.setText("Score: " + this.score);
    }

    // Handles bullet hitting the boss
    bulletHitsBoss(bullet, boss) {
        if (!bullet.active || !boss.active) return;
        bullet.disableBody(true, true);
        bullet.destroy();
        this.bossHealth--;
        this.add.sprite(boss.x, boss.y, "whitePuff00").setScale(0.5).play("puff");

        if (this.bossHealth <= 0 && this.boss) {
            this.cameras.main.shake(250, 0.01);
            this.bossHealthBar.clear();
            this.boss.setActive(false).setVisible(false);
            this.time.delayedCall(300, () => {
                this.sound.play("bossDefeated");
                if (this.bossSound) this.bossSound.stop();
                this.boss.destroy();
                this.boss = null;
                this.winText.setVisible(true);
                this.restartText.setVisible(true);
                this.gameOver = true;
            });
        }
    }

    // Handles player colliding with an enemy
    enemyHitsPlayer(player, enemy) {
        enemy.destroy();
        this.takeDamage();
    }

    // Handles player getting hit by a bullet
    playerHitByBullet(player, bullet) {
        if (!bullet.active) return;
        bullet.disableBody(true, true);
        this.takeDamage();
    }

    // Deducts health and restarts if health = 0
    takeDamage() {
        this.health--;
        this.healthText.setText("Health: " + this.health);
        if (this.health <= 0) this.scene.restart();
    }
}

window.ShooterScene = ShooterScene;
