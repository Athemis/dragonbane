import DoD_Utility from "./utility.js";

export class DoDActor extends Actor {

    /** @override */
    /*
    getData() {
        const context = super.getData();
        const gear = [];

        for (let i of context.items) {
            i.img = i.img || DEFAULT_TOKEN;
            gear.push(i);
        }
        context.gear = gear;

        return context;
    }
    */

    /** @override */
    async _preCreate(data, options, user) {

        await super._preCreate(data, options, user);
    
        // If the created actor has items (only applicable to duplicated actors) bypass the new actor creation logic
        if (!data.items?.length)
        {
            let baseSkills = await DoD_Utility.getBaseSkills();
            if (baseSkills) {}
                data.items = baseSkills;
                this.updateSource(data);
        }
    }
    
    /** @override */
    prepareData() {
        // Prepare data for the actor. Calling the super version of this executes
        // the following, in order: data reset (to clear active effects),
        // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
        // prepareDerivedData().
        super.prepareData();
    }

    /** @override */
    prepareBaseData() {
        super.prepareBaseData();

        // prepare skills
        this._prepareSkills();
        this._prepareBaseChances();
        this._prepareKin();
        this._prepareProfession();
    }

    prepareEmbeddedDocuments() {
        super.prepareEmbeddedDocuments();
        
        switch(this.type)
        {
            case "character":
                this._prepareEquippedItems();
                break;
            case "npc":
                this._prepareEquippedItems();
                break;
            case "monster":
                this._prepareEquippedItems();
                break;
            default:
                break;
        }

    }

    prepareDerivedData() {
        super.prepareDerivedData();

        switch(this.type)
        {
            case "character":
                this._prepareCharacterData();
                break;
            case "npc":
                this._prepareNpcData();
                break;
            case "monster":
                this._prepareMonsterData();
                break;
            default:
                break;
        }
    }

    getSkill(name) {
        let a = name.toLowerCase();
        return this.system.skills?.find(skill => skill.name.toLowerCase() === a);
    }

    _prepareCharacterData() {
        this._prepareActorStats();
        this._prepareCharacterStats();
        this._prepareSpellValues();
    }

    _prepareNpcData() {
        this._prepareActorStats();
        this._prepareNpcStats();
        this._prepareSpellValues();
    }

    _prepareMonsterData() {
        this.system.damageBonus.agl = 0;
        this.system.damageBonus.str = 0;

    }

    _prepareEquippedItems() {
        let armor = null;
        let helmet = null;

        for (let item of this.items.contents) {
            if (item.type == 'armor' && item.system.worn) {
                if (armor) {
                    // Already wearing armor
                    item.update({ ["system.worn"]: false });
                } else {
                    armor = item;
                }
            }
            if (item.type == 'helmet' && item.system.worn) {
                if (helmet) {
                    // Already wearing helmet
                    item.update({ ["system.worn"]: false });
                } else {
                    helmet = item;
                }
            }
        }
        this.system.equippedArmor = armor;
        this.system.equippedHelmet = helmet;        
    }

    _prepareSkills() {

        this.system.skills = [];
        this.system.coreSkills = [];
        this.system.weaponSkills = [];
        this.system.magicSkills = [];
        this.system.secondarySkills = [];
        this.system.trainedSkills = [];
        
        for (let item of this.items.contents) {
            if (item.type == 'skill') {
                let skill = item;
                skill.system.isProfessionSkill = false;
                this.system.skills.push(skill);
                if (skill.system.skillType == 'core') {
                    this.system.coreSkills.push(skill);
                    if(skill.system.value > this._getBaseChance(skill)) {
                        this.system.trainedSkills.push(skill);
                    }
                }  else if (skill.system.skillType == 'weapon') {
                    this.system.weaponSkills.push(skill);
                    if(skill.system.value > this._getBaseChance(skill)) {
                        this.system.trainedSkills.push(skill);
                    }
                } else if (skill.system.skillType == 'magic') {
                    // schools of magic are secondary skills
                    this.system.magicSkills.push(skill);
                    this.system.secondarySkills.push(skill);
                    this.system.trainedSkills.push(skill);
                } else {
                    this.system.secondarySkills.push(skill);
                    this.system.trainedSkills.push(skill);
                }
            }
        }
    }

    _prepareCharacterStats() {
        // Damage Bonus
        this.system.damageBonus.agl = DoD_Utility.calculateDamageBonus(this.system.attributes.agl.value);
        this.system.damageBonus.str = DoD_Utility.calculateDamageBonus(this.system.attributes.str.value);

        // Will Points
        let maxWillPoints = this.system.attributes.wil.value;
        if (this.system.willPoints.max != maxWillPoints) {
            // Attribute changed - keep spent amount (damage) and update max value
            let damage = this.system.willPoints.max - this.system.willPoints.value;
            if (damage < 0) {
                damage = 0;
            } else if (damage > maxWillPoints) {
                damage = maxWillPoints;
            }
            this.update({ 
                ["system.willPoints.max"]: maxWillPoints,
                ["system.willPoints.value"]: maxWillPoints - damage });
        }
        
        // Hit Points
        let maxHitPoints = this.system.attributes.con.value;
        if (this.system.hitPoints.max != maxHitPoints) {
            // Attribute changed - keep damage and update max value
            let damage = this.system.hitPoints.max - this.system.hitPoints.value;
            if (damage < 0) {
                damage = 0;
            } else if (damage > maxHitPoints) {
                damage = maxHitPoints;
            }
            this.update({
                ["system.hitPoints.max"]: maxHitPoints,
                ["system.hitPoints.value"]: maxHitPoints - damage });
        }

        // Death rolls
        /*
        if (this.system.hitPoints.value > 0)
        {
            this.update({
                ["system.deathRolls.successes"]: 0,
                ["system.deathRolls.failures"]: 0 });
        }
        */

        // Movement
        let baseMovement = Number(this.system.kin ? this.system.kin.system.movement : 10);
        let movementModifier =  DoD_Utility.calculateMovementModifier(this.system.attributes.agl.value);
        this.system.movement = baseMovement + movementModifier;
    }

    _prepareActorStats() {

        // Will Points
        if (!Number.isInteger(this.system.willPoints.max)) {
            this.update({ 
                ["system.willPoints.max"]: 10,
                ["system.willPoints.value"]: 10 });
        }
    }

    _prepareNpcStats() {

    }

    _getBaseChance(skill) {
        switch (this.type) {
            case "character":
                const value = this._getAttributeValueFromName(skill.system.attribute);
                return DoD_Utility.calculateBaseChance(value);
            case "npc":
                return 5;
            case "monster":
                return 0;
            default:
                return 0;
        }
    }

    _getAttributeValueFromName(name) {
        let attribute = this.system.attributes[name.toLowerCase()];
        if (attribute) return attribute.value;
        return 0;
    }

    _prepareBaseChances() {
        for (const item of this.items.contents) {
            if (item.type == "skill") {
                const skill = item;
                const baseChance = this._getBaseChance(skill);
                if ((skill.system.skillType == "core" || skill.system.skillType == "weapon") && skill.system.value < baseChance) {
                    skill.system.value = baseChance;
                }
            }
        }
    }

    get isCharacter() {
        return this.type == "character";
    }

    get isNpc() {
        return this.type == "npc";
    }

    get isMonster() {
        return this.type == "monster";
    }

    get isObserver() {
        return this.testUserPermission(game.user, "OBSERVER");
    }

    getArmorValue(damageType) {
        let armorValue = 0;
        if (this.system.equippedArmor) {
            armorValue += this.system.equippedArmor.getArmorValue(damageType);
        }
        if (this.system.equippedHelmet) {
            armorValue += this.system.equippedHelmet.getArmorValue(damageType);
        }
        if (this.type == "monster") {
            armorValue += this.system.armor;
        }
        return armorValue;
    }

    applyDamage(damage) {
        let value = this.system.hitPoints.value;
        let newValue = DoD_Utility.clamp(value - damage, 0, value);
        this.update({["system.hitPoints.value"]: newValue});
    }

    findAbility(abilityName) {
        let name = abilityName.toLowerCase();
        return this.items.find(item => item.type == "ability" && item.name.toLowerCase() == name);
    }

    findSkill(skillName) {
        let name = skillName.toLowerCase();
        return this.items.find(item => item.type == "skill" && item.name.toLowerCase() == name);
    }

    findSpell(spellName) {
        let name = spellName.toLowerCase();
        return this.items.find(item => item.type == "spell" && item.name.toLowerCase() == name);
    }

    hasCondition(attributeName) {
        return this.system.conditions ? this.system.conditions[attributeName].value : false;
    }

    updateCondition(attributeName, value) {
        const field = "system.conditions." + attributeName + ".value";
        this.update({[field]: value})
    }

    async removeKin() {
        let ids = [];
        //  kin items
        this.items.contents.forEach(i => {
            if (i.type == "kin") ids.push(i.id)
        });
        //  kin ability items
        this.items.contents.forEach(i => {
            if (i.type == "ability" && i.system.abilityType == "kin") ids.push(i.id)
        });
        // delete items and clear kin
        await this.deleteEmbeddedDocuments("Item", ids);
        this.system.kin = null;
    }

    async removeProfession() {
        let ids = [];
        //  profession items
        this.items.contents.forEach(i => {
            if (i.type == "profession") ids.push(i.id)
        });
        // delete items and clear profession
        await this.deleteEmbeddedDocuments("Item", ids);
        this.system.profession = null;
    }

    async addKinAbilities() {
        let kin = this.system.kin;

        if (kin && kin.system.abilities.length) {
            let abilities = DoD_Utility.splitAndTrimString(kin.system.abilities);
            let itemData = [];

            for(const abilityName of abilities) {
                // Make sure kin ability exist
                let kinAbility = this.findAbility(abilityName);
                if (!kinAbility) {
                    kinAbility = await DoD_Utility.findAbility(abilityName);
                    if (kinAbility) {
                        itemData.push(kinAbility.toObject());
                    } else {
                        DoD_Utility.WARNING("DoD.WARNING.kinAbility", {ability: abilityName});
                    }
                }
            }
            await this.createEmbeddedDocuments("Item", itemData);
        }
    }

    updateProfession()
    {
        this.system.profession = this.items.find(item => item.type == "profession");
        this.system.professionSkills = [];
        let missingSkills = [];

        if (this.system.profession) {
            let professionSkillNames = DoD_Utility.splitAndTrimString(this.system.profession.system.skills);
            for (const skillName of professionSkillNames) {
                let skill = this.findSkill(skillName);
                if (skill) {
                    skill.system.isProfessionSkill = true;
                } else {
                    missingSkills.push(skillName);
                }
            }
        }
        return missingSkills;
    }

    _prepareKin() {
        this.system.kin = this.items.find(item => item.type == "kin");
    }

    _prepareProfession() {
        this.updateProfession();
    }

    _prepareSpellValues() {
        let magicSchools = new Map;
        let maxValue = 0;

        // find skill values for schools of magic
        for (let item of this.items.contents) {
            if (item.type == "skill" && item.system.skillType == "magic") {
                let skill = item;
                magicSchools.set(skill.name, skill.system.value);
                if (skill.system.value > maxValue) {
                    maxValue = skill.system.value;
                }
            }
        }

        // set the skill value of general spells to max of all magic schools
        let generalSchool = "DoD.spell.general";
        magicSchools.set(generalSchool, maxValue);

        let generalSchoolLocalized = game.i18n.localize(generalSchool);

        for (let item of this.items.contents) {
            if (item.type == "spell") {
                let spell = item;

                // replace general spells school name with localized string if it matches
                if (spell.system.school == generalSchoolLocalized) {
                    spell.system.school = generalSchool;
                    spell.update({ ["system.school"]: generalSchool});
                }

                // set skill values for spell corresponding to school
                if (magicSchools.has(spell.system.school)) {
                    spell.system.skillValue = magicSchools.get(spell.system.school);
                } else {
                    spell.system.skillValue = 0;
                }
            }
        }
    }
}