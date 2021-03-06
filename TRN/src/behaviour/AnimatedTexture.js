TRN.Behaviours.AnimatedTexture = function(nbhv, gameData) {
    this.nbhv = nbhv;
    this.animatedTextures = gameData.sceneData.animatedTextures;
    this.textures = gameData.sceneData.textures;
}

TRN.Behaviours.AnimatedTexture.prototype = {

    constructor : TRN.Behaviours.AnimatedTexture,

    init : async function(lstObjs, resolve) {
        if (lstObjs == null || lstObjs.length == 0) {
            resolve(TRN.Consts.Behaviour.retDontKeepBehaviour);
            return;
        }

		// initialize the animated textures
        for (let i = 0; i < this.animatedTextures.length; ++i) {
            const animTexture = this.animatedTextures[i];
            animTexture.progressor = new TRN.Sequence(animTexture.animcoords.length, 1.0/animTexture.animspeed);
        }

        // collect the materials we will have to update each frame
        const lstMaterials = [];

        for (let i = 0; i < lstObjs.length; ++i) {
            const obj = lstObjs[i],
                  materials = obj.material;
            
            for (let m = 0; m < materials.length; ++m) {
                const material = materials[m],
                      userData = material.userData;

                if (!userData || !userData.animatedTexture) {
                    continue;
                }

                const animTexture = this.animatedTextures[userData.animatedTexture.idxAnimatedTexture];

                if (!animTexture.scrolltexture) {
                    lstMaterials.push(material);
                }
            }
        }

        this.matList = lstMaterials;

        resolve(TRN.Consts.Behaviour.retKeepBehaviour);
    },

    frameStarted : function(curTime, delta) {
		if (!this.animatedTextures) { 
            return; 
        }

		for (let i = 0; i < this.animatedTextures.length; ++i) {
			const animTexture = this.animatedTextures[i];
			animTexture.progressor.update(delta);
		}
    },

    frameEnded : function(curTime, delta) {
        for (let i = 0; i < this.matList.length; ++i) {
            const material = this.matList[i],
                  userData = material.userData,
                  animTexture = this.animatedTextures[userData.animatedTexture.idxAnimatedTexture],
                  coords = animTexture.animcoords[(animTexture.progressor.currentTile + userData.animatedTexture.pos) % animTexture.animcoords.length];

            material.uniforms.map.value = this.textures[coords.texture];
            material.uniforms.offsetRepeat.value[0] = coords.minU - userData.animatedTexture.minU;
            material.uniforms.offsetRepeat.value[1] = coords.minV - userData.animatedTexture.minV;
        }
    }

}
