import DoD_Utility from "./utility.js";
import DoDAttributeTest from "./tests/attribute-test.js";
import DoDSkillTest from "./tests/skill-test.js";
import DoDWeaponTest from "./tests/weapon-test.js";
import DoDSpellTest from "./tests/spell-test.js";
import { DoD } from "./config.js";

export function addChatListeners(app, html, data) {
    html.on("click", ".inline-damage-roll", onInlineDamageRoll);
    html.on("click", ".treasure-roll", onTreasureRoll);
    html.on("click", "button.weapon-roll", onWeaponDamageRoll);
    html.on("click", "button.magic-roll", onMagicDamageRoll);
    html.on("click", "button.push-roll", onPushRoll);
    html.on("click", ".damage-details", onExpandableClick);

    html.on('click contextmenu', '.table-roll', DoD_Utility.handleTableRoll.bind(DoD_Utility));
}

export function addChatMessageContextMenuOptions(html, options) {

    const canDealTargetDamage = li =>
    {
        const element = li.find(".damage-roll")[0];
        if (element?.dataset.targetId) {
            const target = DoD_Utility.getActorFromUUID(element.dataset.targetId);
            return target?.isOwner;
        }
        return false;
    }

    const dealTargetDamage = function(li, multiplier = 1, ignoreArmor = false) {
        const damageData = {};
        const element = li.find(".damage-roll")[0];

        damageData.damage = element.dataset.damage;
        damageData.damageType = element.dataset.damageType.substr(String("DoD.damageTypes.").length);
        damageData.actor = DoD_Utility.getActorFromUUID(element.dataset.targetId);
        damageData.multiplier = multiplier;
        damageData.ignoreArmor = ignoreArmor || element.dataset.ignoreArmor;

        if (damageData.actor.isOwner) {
            applyDamageMessage(damageData);
        } else {
            DoD_Utility.WARNING("DoD.WARNING.noPermissionToModifyActor");
        }
    }

    const canDealSelectedDamage = li =>
    {
        if(canDealTargetDamage(li)) {
            return false;
        }
        if (canvas.tokens.controlled.length > 0 && (li.find(".damage-roll").length > 0 || li.find(".dice-total").length > 0)) {
            for (const token of canvas.tokens.controlled) {
                if (!token.isOwner) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }

    const dealSelectedDamage = function(li, multiplier = 1, ignoreArmor = false) {
        const damageData = {};
        const element = li.find(".damage-roll")[0] || li.find(".dice-total")[0];

        damageData.damage = element.dataset.damage ?? Number(element.innerText);
        damageData.damageType = element.dataset.damageType?.substr(String("DoD.damageTypes.").length);
        damageData.actor = canvas.tokens.controlled[0].actor;
        damageData.multiplier = multiplier;
        damageData.ignoreArmor = ignoreArmor || element.dataset.ignoreArmor;

        const targets = canvas.tokens.controlled;
        for (const target of targets) {
            if (target.actor.isOwner) {
                damageData.actor = target.actor;              
                applyDamageMessage(damageData);
            } else {
                DoD_Utility.WARNING("DoD.WARNING.noPermissionToModifyActor");
            }
        }
    }

    const canHealSelectedDamage = li =>
    {
        if (canvas.tokens.controlled.length > 0 && li.find(".dice-total").length > 0 && li.find(".damage-roll").length == 0) {
            for (const token of canvas.tokens.controlled) {
                if (!token.isOwner) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }

    const healSelectedDamage = function(li) {
        const healingData = {};
        const element = li.find(".dice-total")[0];

        healingData.damage = Number(element.innerText);

        for (const target of canvas.tokens.controlled) {
            if (target.actor.isOwner) {
                healingData.actor = target.actor;              
                applyHealingMessage(healingData);
            } else {
                DoD_Utility.WARNING("DoD.WARNING.noPermissionToModifyActor");
            }
        }
    }

    const canUndoDamage = li =>
    {
        const element = li.find(".damage-message")[0];
        if (element?.dataset.actorId) {
            const target = DoD_Utility.getActorFromUUID(element.dataset.actorId);
            return target?.isOwner && Number(element?.dataset.damage) != 0;
        }
        return false;
    }

    const undoDamage = function(li) {
        const element = li.find(".damage-message")[0];
        const healingData = {
            actor: DoD_Utility.getActorFromUUID(element?.dataset.actorId),
            damage: Number(element?.dataset.damage)
        };
        applyHealingMessage(healingData);
    }


    options.push(
        {
            name: game.i18n.format("DoD.ui.chat.dealDamage"),
            icon: '<i class="fas fa-user-minus"></i>',
            condition: canDealTargetDamage,
            callback: li => dealTargetDamage(li)
        },
        {
            name: game.i18n.format("DoD.ui.chat.dealHalfDamage"),
            icon: '<i class="fas fa-user-minus"></i>',
            condition: canDealTargetDamage,
            callback: li => dealTargetDamage(li, 0.5)
        },
        {
            name: game.i18n.format("DoD.ui.chat.dealDoubleDamage"),
            icon: '<i class="fas fa-user-minus"></i>',
            condition: canDealTargetDamage,
            callback: li => dealTargetDamage(li, 2)
        },
        {
            name: game.i18n.format("DoD.ui.chat.dealDamageIgnoreArmor"),
            icon: '<i class="fas fa-user-minus"></i>',
            condition: canDealTargetDamage,
            callback: li => dealTargetDamage(li, 1, true)
        },
        {
            name: game.i18n.format("DoD.ui.chat.dealSelectedDamage"),
            icon: '<i class="fas fa-user-minus"></i>',
            condition: canDealSelectedDamage,
            callback: li => dealSelectedDamage(li)
        },
        {
            name: game.i18n.format("DoD.ui.chat.dealSelectedHalfDamage"),
            icon: '<i class="fas fa-user-minus"></i>',
            condition: canDealSelectedDamage,
            callback: li => dealSelectedDamage(li, 0.5)
        },
        {
            name: game.i18n.format("DoD.ui.chat.dealSelectedDoubleDamage"),
            icon: '<i class="fas fa-user-minus"></i>',
            condition: canDealSelectedDamage,
            callback: li => dealSelectedDamage(li, 2)
        },
        {
            name: game.i18n.format("DoD.ui.chat.dealSelectedDamageIgnoreArmor"),
            icon: '<i class="fas fa-user-minus"></i>',
            condition: canDealSelectedDamage,
            callback: li => dealSelectedDamage(li, 1, true)
        },
        {
            name: game.i18n.format("DoD.ui.chat.healSelectedDamage"),
            icon: '<i class="fas fa-user-plus"></i>',
            condition: canHealSelectedDamage,
            callback: li => healSelectedDamage(li)
        },
        {
            name: game.i18n.format("DoD.ui.chat.undoDamage"),
            icon: '<i class="fas fa-undo-alt"></i>',
            condition: canUndoDamage,
            callback: li => undoDamage(li)
        }
    );
}

export async function onInlineDamageRoll(event) {
    event.stopPropagation();
    event.preventDefault();

    const element = event.currentTarget;
    const actorId = element.dataset.actorId;
    const actor = actorId ? DoD_Utility.getActorFromUUID(actorId) : null;
    const damageType = element.dataset.damageType;
    const damage = element.dataset.damage;
    const action = element.dataset.action;
    let damageData = {
        actor: actor,
        action: action,
        damage: damage,
        damageType: damageType
    };
    
    const targets = Array.from(game.user.targets)
    if (targets.length > 0) {
        for (const target of targets) {
            damageData.target = target.actor;
            await inflictDamageMessage(damageData);    
        }
     } else {
        await inflictDamageMessage(damageData);    
    }
}
export async function onTreasureRoll(event) {
    event.stopPropagation();
    event.preventDefault();

    const element = event.currentTarget;
    const count = element.dataset.count;

    DoD_Utility.drawTreasureCards(count);
}

async function onWeaponDamageRoll(event) {
    const element = event.currentTarget;
    const actorId = element.dataset.actorId;
    const actor = DoD_Utility.getActorFromUUID(actorId);
    if (!actor) return;    
    
    const weaponId = element.dataset.weaponId;
    const damageType = element.dataset.damageType;
    const ignoreArmor = element.dataset.ignoreArmor;
    const weapon = actor.items.get(weaponId);
    const weaponDamage = weapon ? weapon.system.damage : null;
    const skill = weapon ? actor.findSkill(weapon.system.skill.name) : null;
    const attribute = skill ? skill.system.attribute : null;
    let damageBonus = attribute ? actor.system.damageBonus[attribute] : 0;
    if (damageBonus == "" && attribute == "agl") {
        damageBonus = actor.system.damageBonus["agl"];
    }
    if (weapon.hasWeaponFeature("noDamageBonus")) {
        damageBonus = 0;
    }
    const extraDamage = element.dataset.extraDamage;

    let damage = weaponDamage;
    if (damageBonus && damageBonus != "0" && damageBonus != "none") {
        damage += " + " + damageBonus;
    }
    if (extraDamage && extraDamage != "0") {
        damage += " + " + extraDamage;
    }

    let target = element.dataset.targetId ? DoD_Utility.getActorFromUUID(element.dataset.targetId) : null;


    const damageData = {
        actor: actor,
        weapon: weapon,
        damage: damage,
        damageType: damageType,
        ignoreArmor: ignoreArmor,
        target: target
    };
 
    if (element.dataset.isMeleeCrit) {
        const parent = element.parentElement;
        const critChoices = parent.getElementsByTagName("input");
        const choice = Array.from(critChoices).find(e => e.name=="critChoice" && e.checked);

        damageData[choice.value] = true;

        ChatMessage.create({
            content: game.i18n.localize("DoD.critChoices.choiceLabel") + ": "+ game.i18n.localize("DoD.critChoices." + choice.value),
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: damageData.actor }),
        });
    }

    if (!target) {
        const targets = Array.from(game.user.targets)
        if (targets.length > 0) {
            for (const target of targets) {
                damageData.target = target.actor;
                await inflictDamageMessage(damageData);    
            }
            return;
        }
    }
    inflictDamageMessage(damageData);    
}

async function onMagicDamageRoll(event) {
    const element = event.currentTarget;
    const actorId = element.dataset.actorId;
    const actor = DoD_Utility.getActorFromUUID(actorId);
    if (!actor) return;

    const spellId = element.dataset.spellId;
    const spell = spellId ? actor.items.get(spellId) : null;
    const powerLevel = Number(element.dataset.powerLevel);
    const isMagicCrit = element.dataset.isMagicCrit;
    let doubleDamage = false;

    if (isMagicCrit) {
    
        const parent = element.parentElement;
        const critChoices = parent.getElementsByTagName("input");
        const choice = Array.from(critChoices).find(e => e.name=="magicCritChoice" && e.checked);

        const message = {
            flavor: game.i18n.localize("DoD.magicCritChoices.choiceLabel") + ": "+ game.i18n.localize("DoD.magicCritChoices." + choice.value),
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: actor }),
        };

        if (choice.value == "noCost") {
            const wpOld = actor.system.willPoints.value;
            const wpCost = Number(element.dataset.wpCost);
            const wpNew = Math.min(actor.system.willPoints.max, wpOld + wpCost);
            await actor.update({ ["system.willPoints.value"]: wpNew});

            message.content = `
            <div class="damage-details permission-observer" data-actor-id="${actor.uuid}">
                <i class="fa-solid fa-circle-info"></i>
                <div class="expandable" style="text-align: left; margin-left: 0.5em">
                    <b>${game.i18n.localize("DoD.ui.character-sheet.wp")}:</b> ${wpOld} <i class="fa-solid fa-arrow-right"></i> ${wpNew}<br>
                </div>
            </div>`;
        }
        if (choice.value == "doubleDamage") {
            doubleDamage = true;
        }

        ChatMessage.create(message);        
    }

    if (spell?.isDamaging) {

        let damage = spell.system.damage;
        if (powerLevel > 1 && spell.system.damagePerPowerlevel.length > 0) {
            for (let i = 1; i < powerLevel; ++i) {
                if (damage.length > 0) {
                    damage += " + ";
                }
                damage += spell.system.damagePerPowerlevel;
            }
        }

        const target = element.dataset.targetId ? DoD_Utility.getActorFromUUID(element.dataset.targetId) : null;

        const damageData = {
            actor: actor,
            weapon: spell,
            damage: damage,
            damageType: DoD.damageTypes.none,
            doubleSpellDamage: doubleDamage,
            target: target
        };

        if (!target) {
            const targets = Array.from(game.user.targets)
            if (targets.length > 0) {
                for (const target of targets) {
                    damageData.target = target.actor;
                    await inflictDamageMessage(damageData);    
                }
                return;
            }
        }    
        inflictDamageMessage(damageData);    
    }
}

function onPushRoll(event) {
    console.log("onPushRoll");
    const element = event.currentTarget;
    const actorId = element.dataset.actorId;
    const actor = DoD_Utility.getActorFromUUID(actorId);
    if (!actor) return;    

    // Take condition
    const parent = element.parentElement;
    const pushChoices = parent.getElementsByTagName("input");
    const choice = Array.from(pushChoices).find(e => e.name=="pushRollChoice" && e.checked);
    if (!actor.hasCondition(choice.value)) {
        actor.updateCondition(choice.value, true);
        const msg = game.i18n.format("DoD.ui.chat.takeCondition", 
            {
                actor: actor.name,
                condition: game.i18n.localize("DoD.conditions." + choice.value)
            });
        ChatMessage.create({ 
            content: msg,
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: actor })
        });
    } else {
        DoD_Utility.WARNING("DoD.WARNING.conditionAlreadyTaken");
        return;
    }

    // Re-roll
    const options = {
        actorId: element.dataset.actorId,
        attribute: element.dataset.attribute,
        formula: element.dataset.formula,
        canPush: false,
        skipDialog: true,
        isReRoll: true
    }
    let test = null;
    switch (element.dataset.rollType) {
        case "DoDAttributeTest":
            test = new DoDAttributeTest(actor, options.attribute, options);
            break;
        case "DoDSkillTest":
            options.skill = actor.findSkill(element.dataset.skillName)
            test = new DoDSkillTest(actor, options.skill, options);
            break;
        case "DoDWeaponTest":
            options.action = element.dataset.action;
            options.extraDamage = element.dataset.extraDamage;
            options.weapon = fromUuidSync(element.dataset.weaponId);
            test = new DoDWeaponTest(actor, options.weapon, options);
            break;
        case "DoDSpellTest":
            options.spell = actor.findSpell(element.dataset.spellName);
            options.powerLevel = Number(element.dataset.powerLevel);
            options.wpCost = Number(element.dataset.wpCost);
            test = new DoDSpellTest(actor, options.spell, options);
            break;
        default:
            return;
    }
    test?.roll();
}

export async function inflictDamageMessage(damageData) {
  
    // Add "1" in front of D to make sure the first roll term is a Die.
    let formula = damageData.damage;
    if (formula[0] == "d" || formula[0] == "D") {
        formula = "1" + formula;
    }

    const roll = new Roll(formula);

    if (damageData.doubleWeaponDamage && roll.terms.length > 0) {
        let term = roll.terms[0];
        if (term instanceof Die) {
            term.number *= 2;
        }
    }

    await roll.roll({async: true});

    const weaponName = damageData.weapon?.name ?? damageData.action;
    let msg = weaponName ? (damageData.ignoreArmor ? "DoD.roll.damageIgnoreArmor" : "DoD.roll.damageWeapon") : "DoD.roll.damage";
    if (damageData.target) {
        msg += "Target";
    }
    const actorName = damageData.actor ? (damageData.actor.isToken ? damageData.actor.token.name : damageData.actor.name) : "";
    const targetName = damageData.target ? (damageData.target.isToken ? damageData.target.token.name : damageData.target.name) : "";
    const damageTotal = damageData.doubleSpellDamage ? 2 * roll.total : roll.total;

    const flavor = game.i18n.format(game.i18n.localize(msg), {
        actor: actorName,
        damage: damageTotal,
        damageType: game.i18n.localize(damageData.damageType),
        weapon: weaponName,
        target: targetName
    });
    
    const template = "systems/dragonbane/templates/partials/damage-roll-message.hbs";
    const templateContext = {
        formula: damageData.doubleSpellDamage ? "2 x (" + roll.formula + ")" : roll.formula,
        user: game.user.id,
        tooltip: await roll.getTooltip(),
        total: damageTotal,
        damageType: damageData.damageType,
        ignoreArmor: damageData.ignoreArmor,
        target: damageData.target
    };
    const renderedTemplate = await renderTemplate(template, templateContext);

    const messageData = {
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: damageData.actor }),
        flavor: flavor,
        content: renderedTemplate
    };
    roll.toMessage(messageData);
}

export async function applyDamageMessage(damageData) {

    const actor = damageData.actor;
    const damage = damageData.damage;
    const damageType = damageData.damageType;
    const multiplier = damageData.multiplier;
    const ignoreArmor = damageData.ignoreArmor;
    const armorValue = ignoreArmor ? 0 : actor.getArmorValue(damageType);
    const damageToApply = Math.max(0, Math.floor((damage - armorValue) * multiplier));
    const oldHP = actor.system.hitPoints.value;

    if (damageToApply > 0) {
        await actor.applyDamage(damageToApply);
    }
    const newHP = actor.system.hitPoints.value;
    const damageTaken = oldHP - newHP;

    const actorName = actor.isToken ? actor.token.name : actor.name;
    const permissionKey = DoD_Utility.getViewDamagePermission().toLowerCase();

    const msg = `
        <div class="damage-message permission-${permissionKey}" data-damage="${damageTaken}" data-actor-id="${actor.uuid}">
            ${game.i18n.format(game.i18n.localize("DoD.ui.chat.damageApplied"), {damage: damageTaken, actor: actorName})}
            <div class="damage-details permission-observer" data-actor-id="${actor.uuid}">
                <i class="fa-solid fa-circle-info"></i>
                <div class="expandable" style="text-align: left; margin-left: 0.5em">
                    <b>${game.i18n.localize("DoD.ui.chat.damageDetailDamage")}:</b> ${damage} ${game.i18n.localize("DoD.damageTypes." + damageType)}<br>
                    <b>${game.i18n.localize("DoD.ui.chat.damageDetailArmor")}:</b> ${armorValue}<br>
                    <b>${game.i18n.localize("DoD.ui.chat.damageDetailMultiplier")}:</b> x${multiplier}<br>
                    <b>${game.i18n.localize("DoD.ui.chat.damageDetailTotal")}:</b> ${damageToApply}<br>
                    <b>${game.i18n.localize("DoD.ui.character-sheet.hp")}:</b> ${oldHP} <i class="fa-solid fa-arrow-right"></i> ${newHP}<br>
                </div>
            </div>            
        </div>
        <div class="damage-message permission-not-${permissionKey}" data-actor-id="${actor.uuid}">
            ${game.i18n.format(game.i18n.localize("DoD.ui.chat.damageApplied"), {damage: "???", actor: actorName})}
        </div>
    `;

    if (actor.type == "character") {
        const token = canvas.scene.tokens.find(t => t.actor.uuid == actor.uuid);

        // Characters add death roll when at 0 HP and taking damage
        if (oldHP == 0 && damageToApply > 0) {
            let failures = actor.system.deathRolls.failures;
            if (failures < 3) {
                await actor.update({["system.deathRolls.failures"]: ++failures});
                msg += "<p>" + game.i18n.format("DoD.ui.chat.failedDeathRoll", {actor: actorName}) + "</p>";
                if (failures == 3) {
                    const status = CONFIG.statusEffects.find(a => a.id === 'dead');
                    token.toggleActiveEffect(status, {active: true});
                    msg += "<p>" + game.i18n.format("DoD.ui.chat.characterDied", {actor: actorName}) + "</p>";
                }
            }
        }
        // Characters go prone when reaching 0 HP
        if (oldHP > 0 && damageToApply >= oldHP) {
            if (token && !token.hasStatusEffect("prone")) {
                const status = CONFIG.statusEffects.find(a => a.id === 'prone');
                token.toggleActiveEffect(status, {active: true});
                msg += "<p>" + game.i18n.format("DoD.ui.chat.characterProne", {actor: actorName}) + "</p>";
            }
        }
    }

    ChatMessage.create({ content: msg });
}

export async function applyHealingMessage(damageData) {

    const actor = damageData.actor;
    const damage = damageData.damage;
    const oldHP = actor.system.hitPoints.value;
    let newHP = oldHP;

    if (damage > 0) {
        newHP = await actor.applyDamage(-damage);
    }
    
    const actorName = actor.isToken ? actor.token.name : actor.name;
    const permissionKey = DoD_Utility.getViewDamagePermission().toLowerCase();

    const msg = `
    <div class="permission-${permissionKey}" data-actor-id="${actor.uuid}">
        ${game.i18n.format(game.i18n.localize("DoD.ui.chat.healingApplied"), {damage: newHP - oldHP, actor: actorName})}
        <div class="damage-details permission-observer" data-actor-id="${actor.uuid}">
            <i class="fa-solid fa-circle-info"></i>
            <div class="expandable" style="text-align: left; margin-left: 0.5em">
                <b>${game.i18n.localize("DoD.ui.character-sheet.hp")}:</b> ${oldHP} <i class="fa-solid fa-arrow-right"></i> ${newHP}<br>
            </div>
        </div>            
    </div>
    <div class="permission-not-${permissionKey}" data-actor-id="${actor.uuid}">
        ${game.i18n.format(game.i18n.localize("DoD.ui.chat.healingApplied"), {damage: "???", actor: actorName})}
    </div>`;

    ChatMessage.create({ content: msg });
}

export function hideChatPermissions(app, html, data) {

    if (!game.user.isGM) {
        html.find(".permission-gm").remove();
    } else {
        html.find(".permission-not-gm").remove();
    }

    let elements = html.find(".permission-owner");
    elements.each((i, element) => {
        const actor = DoD_Utility.getActorFromUUID(element.dataset.actorId, {noWarnings: true});
        if (actor && !actor.isOwner) {
            element.remove();
        }
    });

    elements = html.find(".permission-not-owner");
    elements.each((i, element) => {
        const actor = DoD_Utility.getActorFromUUID(element.dataset.actorId, {noWarnings: true});
        if (actor && actor.isOwner) {
            element.remove();
        }
    });

    elements = html.find(".permission-observer");
    elements.each((i, element) => {
        const actor = DoD_Utility.getActorFromUUID(element.dataset.actorId, {noWarnings: true});
        if (actor && !actor.isObserver) {
            element.remove();
        }
    });

    elements = html.find(".permission-not-observer");
    elements.each((i, element) => {
        const actor = DoD_Utility.getActorFromUUID(element.dataset.actorId, {noWarnings: true});
        if (actor && actor.isObserver) {
            element.remove();
        }
    });

    elements = html.find(".permission-limited");
    elements.each((i, element) => {
        const actor = DoD_Utility.getActorFromUUID(element.dataset.actorId, {noWarnings: true});
        if (actor && !actor.isLimited) {
            element.remove();
        }
    });

    elements = html.find(".permission-not-limited");
    elements.each((i, element) => {
        const actor = DoD_Utility.getActorFromUUID(element.dataset.actorId, {noWarnings: true});
        if (actor && actor.isLimited) {
            element.remove();
        }
    });

    elements = html.find(".permission-not-none");
    elements.remove();
}

export function onExpandableClick(event) {
    event.preventDefault();

    // Toggle the message flag
    let roll = event.currentTarget;
    const message = game.messages.get(roll.closest(".message").dataset.messageId);
    message._expanded = !message._expanded;

    // Expand or collapse tooltips
    const tooltips = roll.querySelectorAll(".expandable");
    for ( let tip of tooltips ) {
      if ( message._expanded ) $(tip).slideDown(200);
      else $(tip).slideUp(200);
      tip.classList.toggle("expanded", message._expanded);
    }
  }