TRN.Play = function (container) {

    this.gameData = {
        "container": jQuery(container),

        "curRoom": -1,
        "camera": null,

        "sceneRender":  null,
        "sceneData": null,
        "sceneBackground": null,

        "singleRoomMode": false,

        "panel": null,
        
        "bhvMgr": null,
        "objMgr": null,
        "matMgr": null,
        "confMgr": null,

        "startTime": -1,
        "lastTime": -1,
        "quantum": 1/TRN.baseFrameRate,
        "quantumTime": -1,
        "quantumRnd": 0,
    
        "flickerColor" : [1.2, 1.2, 1.2],
        "unitVec3" : [1.0, 1.0, 1.0],
        "globalTintColor":  null,

        "fps": 0
    };

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.gameData.container.width(), this.gameData.container.height());
    this.renderer.autoClear = false;

	this.gameData.container.append( this.renderer.domElement );

    this.gameData.panel = new TRN.Panel(this.gameData.container, this.gameData, this.renderer);
	this.gameData.panel.hide();

	this.stats = new Stats();
	this.stats.domElement.style.position = 'absolute';
	this.stats.domElement.style.top = '0px';
	this.stats.domElement.style.right = '0px';
	this.stats.domElement.style.zIndex = 100;

	this.gameData.container.append(this.stats.domElement);

	TRN.Browser.bindRequestPointerLock(document.body);
	TRN.Browser.bindRequestFullscreen(document.body);
}

TRN.Play.prototype = {

	constructor : TRN.Play,

	start : async function (sceneJSON, scene) {
        this.gameData.sceneData = sceneJSON.data;
		this.gameData.sceneRender = scene;
        this.gameData.sceneBackground = new THREE.Scene();

        this.gameData.camera = this.gameData.sceneRender.getObjectByName("camera1");

        this.gameData.confMgr = this.gameData.sceneData.trlevel.confMgr;
        this.gameData.bhvMgr  = new TRN.Behaviours.BehaviourManager();
        this.gameData.matMgr  = new TRN.MaterialManager();
        this.gameData.objMgr  = new TRN.ObjectManager();
        this.gameData.trlvl   = new TRN.TRLevel();
        this.gameData.anmMgr  = new TRN.AnimationManager();
        this.gameData.shdMgr  = new TRN.ShaderManager();

        this.gameData.bhvMgr.initialize(this.gameData);
        this.gameData.matMgr.initialize(this.gameData);
        this.gameData.objMgr.initialize(this.gameData);
        this.gameData.trlvl.initialize(this.gameData);
        this.gameData.anmMgr.initialize(this.gameData);

        delete this.gameData.sceneData.trlevel.confMgr;
        delete this.gameData.sceneData.trlevel;
        
        TRN.ObjectID.Lara  = this.gameData.confMgr.number('lara > id', true, 0);

		var isCutScene = this.gameData.confMgr.param('', false, true).attr('type') == 'cutscene';
        var cutsceneIndex = this.gameData.sceneData.rversion == 'TR4' && TRN.Browser.QueryString.cutscene != undefined ? parseInt(TRN.Browser.QueryString.cutscene) : -1;

        this.gameData.isCutscene = isCutScene || cutsceneIndex > 0;

		var tintColor = this.gameData.confMgr.color('globaltintcolor', true, null);

		if (tintColor != null) {
			this.gameData.globalTintColor = [tintColor.r, tintColor.g, tintColor.b];
		}

		if (this.gameData.sceneData.rversion != 'TR4') {
			jQuery('#nobumpmapping').prop('disabled', 'disabled');
		}

		if (TRN.Browser.QueryString.pos) {
			var vals = TRN.Browser.QueryString.pos.split(',');
			this.gameData.camera.position.set(parseFloat(vals[0]), parseFloat(vals[1]), parseFloat(vals[2]));
		}

		if (TRN.Browser.QueryString.rot) {
			var vals = TRN.Browser.QueryString.rot.split(',');
			this.gameData.camera.quaternion.set(parseFloat(vals[0]), parseFloat(vals[1]), parseFloat(vals[2]), parseFloat(vals[3]));
		}

        this.gameData.trlvl.createObjectsInLevel();

        // create behaviours
        var allPromises = this.gameData.bhvMgr.loadBehaviours();

        allPromises.push(this.gameData.bhvMgr.addBehaviour('Sprite'));
        allPromises.push(this.gameData.bhvMgr.addBehaviour('AnimatedTexture', null, null, null, this.gameData.objMgr.collectObjectsWithAnimatedTextures()));

        if (cutsceneIndex >= 0) {
            allPromises.push(this.gameData.bhvMgr.addBehaviour('CutScene', { "index": cutsceneIndex, "useadditionallights": true }));
        }

        await Promise.all(allPromises);

        // set uniforms on objects
        this.gameData.sceneRender.traverse( (obj) => {
            var data = this.gameData.sceneData.objects[obj.name];

            if (!data || data.roomIndex < 0) return;

            this.gameData.matMgr.setUniformsFromRoom(obj, data.roomIndex);
        });

		this.gameData.panel.show();
        this.gameData.panel.updateFromParent();

		window.addEventListener( 'resize', this.onWindowResize.bind(this), false );

		//!this.renderer.initWebGLObjects(this.gameData.sceneRender);
        //!this.renderer.initWebGLObjects(this.gameData.sceneBackground);

        this.gameData.startTime = this.gameData.lastTime = this.gameData.quantumTime = (new Date()).getTime() / 1000.0;
    
        this.gameData.bhvMgr.onBeforeRenderLoop();

		this.renderLoop();

        this.onWindowResize();
	},

	renderLoop : function () {
		requestAnimationFrame( this.renderLoop.bind(this) );

		var curTime = (new Date()).getTime() / 1000.0;

        var delta = curTime - this.gameData.lastTime;

        this.gameData.lastTime = curTime;

		if (curTime - this.gameData.quantumTime > this.gameData.quantum) {
			this.gameData.quantumRnd = Math.random();
			this.gameData.quantumTime = curTime;
		}

		curTime = curTime - this.gameData.startTime;

        if (delta > 0.1) delta = 0.1;
        
        this.gameData.fps = delta ? 1/delta : 60;

        this.gameData.bhvMgr.frameStarted(curTime, delta);

		this.gameData.anmMgr.animateObjects(delta);

		this.gameData.camera.updateMatrixWorld();

		this.gameData.objMgr.updateObjects(curTime);

        this.gameData.bhvMgr.frameEnded(curTime, delta);

        this.render();
	},

	render : function () {
        //this.renderer.clear(true, true, true);

        this.renderer.render( this.gameData.sceneBackground, this.gameData.camera );

		this.renderer.render( this.gameData.sceneRender, this.gameData.camera );

		this.stats.update();

		this.gameData.panel.showInfo();
	},

	onWindowResize : function () {
		this.gameData.camera.aspect = this.gameData.container.width() / this.gameData.container.height();
		this.gameData.camera.updateProjectionMatrix();

		this.renderer.setSize( this.gameData.container.width(), this.gameData.container.height() );

		this.render();
	}

}
