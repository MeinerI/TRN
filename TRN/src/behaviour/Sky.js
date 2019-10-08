TRN.Behaviours.Sky = function(nbhv, gameData) {
    this.nbhv = nbhv;
    this.scene = gameData.sceneRender;
    this.sceneData = gameData.sceneData;
    this.sceneBackground = gameData.sceneBackground;
    this.objMgr = gameData.objMgr;
    this.anmMgr = gameData.anmMgr;
    this.shdMgr = gameData.shdMgr;
    this.camera = gameData.camera;
}

TRN.Behaviours.Sky.prototype = {

    constructor : TRN.Behaviours.Sky,

    init : async function(lstObjs, resolve) {
        var id = this.nbhv.id, 
            hide = this.nbhv.hide == 'true', 
            noanim = this.nbhv.noanim == 'true';

        if (hide) {
            resolve(TRN.Consts.Behaviour.retDontKeepBehaviour);
            return;
        }

        this.objSky = this.objMgr.createMoveable(id, -1, undefined, false, false);

        if (this.objSky == null) {
            resolve(TRN.Consts.Behaviour.retDontKeepBehaviour);
            return;
        }

        var data = this.sceneData.objects[this.objSky.name];

        data.has_anims = !noanim;

        this.objSky.renderDepth = 1;
        this.objSky.matrixAutoUpdate = true;

        if (data.has_anims) {
            this.anmMgr.setAnimation(this.objSky, data.animationStartIndex, false);
        }

        this.sceneBackground.add(this.objSky);

        var materials = this.objSky.material;
        for (var mat = 0; mat < materials.length; ++mat) {
            var material = materials[mat];
            
            material.depthWrite = false;
            material.fragmentShader = this.shdMgr.getFragmentShader('sky');
            material.vertexShader = this.shdMgr.getVertexShader('sky');
            //material.depthTest = false;
        }

        resolve(TRN.Consts.Behaviour.retKeepBehaviour);
    },

    frameEnded : function() {
        this.objSky.position.set(this.camera.position.x, this.camera.position.y, this.camera.position.z);
    }

}
