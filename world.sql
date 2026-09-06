-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               8.0.46 - MySQL Community Server - GPL
-- Server OS:                    Win64
-- HeidiSQL Version:             12.10.0.7000
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- Dumping structure for table world.access_requirement
CREATE TABLE IF NOT EXISTS `access_requirement` (
  `mapId` int unsigned NOT NULL,
  `difficulty` tinyint unsigned NOT NULL DEFAULT '0',
  `level_min` tinyint unsigned NOT NULL DEFAULT '0',
  `level_max` tinyint unsigned NOT NULL DEFAULT '0',
  `item_level` smallint unsigned NOT NULL DEFAULT '0',
  `item` int unsigned NOT NULL DEFAULT '0',
  `item2` int unsigned NOT NULL DEFAULT '0',
  `quest_done_A` int unsigned NOT NULL DEFAULT '0',
  `quest_done_H` int unsigned NOT NULL DEFAULT '0',
  `completed_achievement` int unsigned NOT NULL DEFAULT '0',
  `quest_failed_text` mediumtext COLLATE utf8mb4_unicode_ci,
  `comment` mediumtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`mapId`,`difficulty`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC COMMENT='Access Requirements';

-- Data exporting was unselected.

-- Dumping structure for table world.achievement_dbc
CREATE TABLE IF NOT EXISTS `achievement_dbc` (
  `ID` int unsigned NOT NULL,
  `requiredFaction` int NOT NULL DEFAULT '-1',
  `mapID` int NOT NULL DEFAULT '-1',
  `points` int unsigned NOT NULL DEFAULT '0',
  `flags` int unsigned NOT NULL DEFAULT '0',
  `count` int unsigned NOT NULL DEFAULT '0',
  `refAchievement` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`ID`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.achievement_reward
CREATE TABLE IF NOT EXISTS `achievement_reward` (
  `ID` int unsigned NOT NULL DEFAULT '0',
  `TitleA` int unsigned NOT NULL DEFAULT '0',
  `TitleH` int unsigned NOT NULL DEFAULT '0',
  `ItemID` int unsigned NOT NULL DEFAULT '0',
  `Sender` int unsigned NOT NULL DEFAULT '0',
  `Subject` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Body` mediumtext COLLATE utf8mb4_unicode_ci,
  `MailTemplateID` int unsigned DEFAULT '0',
  PRIMARY KEY (`ID`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=FIXED COMMENT='Loot System';

-- Data exporting was unselected.

-- Dumping structure for table world.achievement_reward_locale
CREATE TABLE IF NOT EXISTS `achievement_reward_locale` (
  `ID` int unsigned NOT NULL DEFAULT '0',
  `Locale` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Subject` mediumtext COLLATE utf8mb4_unicode_ci,
  `Body` mediumtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`ID`,`Locale`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.achievement_scripts
CREATE TABLE IF NOT EXISTS `achievement_scripts` (
  `AchievementId` int NOT NULL,
  `ScriptName` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`AchievementId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.areatrigger
CREATE TABLE IF NOT EXISTS `areatrigger` (
  `SpawnId` bigint unsigned NOT NULL,
  `AreaTriggerCreatePropertiesId` int unsigned NOT NULL,
  `IsCustom` tinyint unsigned NOT NULL,
  `MapId` int unsigned NOT NULL,
  `SpawnDifficulties` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0',
  `PosX` float NOT NULL,
  `PosY` float NOT NULL,
  `PosZ` float NOT NULL,
  `Orientation` float NOT NULL,
  `PhaseUseFlags` tinyint unsigned DEFAULT '0',
  `PhaseId` int unsigned DEFAULT '0',
  `PhaseGroup` int unsigned DEFAULT '0',
  `SpellForVisuals` int DEFAULT NULL,
  `ScriptName` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `Comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`SpawnId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.areatrigger_create_properties
CREATE TABLE IF NOT EXISTS `areatrigger_create_properties` (
  `Id` int unsigned NOT NULL,
  `IsCustom` tinyint unsigned NOT NULL,
  `AreaTriggerId` int unsigned NOT NULL,
  `IsAreatriggerCustom` tinyint unsigned NOT NULL,
  `Flags` int unsigned NOT NULL DEFAULT '0',
  `MoveCurveId` int unsigned NOT NULL DEFAULT '0',
  `ScaleCurveId` int unsigned NOT NULL DEFAULT '0',
  `MorphCurveId` int unsigned NOT NULL DEFAULT '0',
  `FacingCurveId` int unsigned NOT NULL DEFAULT '0',
  `AnimId` int NOT NULL DEFAULT '-1',
  `AnimKitId` int NOT NULL DEFAULT '0',
  `DecalPropertiesId` int unsigned NOT NULL DEFAULT '0',
  `TimeToTarget` int unsigned NOT NULL DEFAULT '0',
  `TimeToTargetScale` int unsigned NOT NULL DEFAULT '0',
  `Shape` tinyint unsigned NOT NULL DEFAULT '0',
  `ShapeData0` float NOT NULL DEFAULT '0',
  `ShapeData1` float NOT NULL DEFAULT '0',
  `ShapeData2` float NOT NULL DEFAULT '0',
  `ShapeData3` float NOT NULL DEFAULT '0',
  `ShapeData4` float NOT NULL DEFAULT '0',
  `ShapeData5` float NOT NULL DEFAULT '0',
  `ShapeData6` float NOT NULL DEFAULT '0',
  `ShapeData7` float NOT NULL DEFAULT '0',
  `ScriptName` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `VerifiedBuild` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`Id`,`IsCustom`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.areatrigger_create_properties_orbit
CREATE TABLE IF NOT EXISTS `areatrigger_create_properties_orbit` (
  `AreaTriggerCreatePropertiesId` int unsigned NOT NULL,
  `IsCustom` tinyint unsigned NOT NULL,
  `StartDelay` int unsigned NOT NULL DEFAULT '0',
  `CircleRadius` float NOT NULL DEFAULT '0',
  `BlendFromRadius` float NOT NULL DEFAULT '0',
  `InitialAngle` float NOT NULL DEFAULT '0',
  `ZOffset` float NOT NULL DEFAULT '0',
  `CounterClockwise` tinyint unsigned NOT NULL DEFAULT '0',
  `CanLoop` tinyint unsigned NOT NULL DEFAULT '0',
  `VerifiedBuild` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`AreaTriggerCreatePropertiesId`,`IsCustom`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.areatrigger_create_properties_polygon_vertex
CREATE TABLE IF NOT EXISTS `areatrigger_create_properties_polygon_vertex` (
  `AreaTriggerCreatePropertiesId` int unsigned NOT NULL,
  `IsCustom` tinyint unsigned NOT NULL,
  `Idx` int unsigned NOT NULL,
  `VerticeX` float NOT NULL DEFAULT '0',
  `VerticeY` float NOT NULL DEFAULT '0',
  `VerticeTargetX` float DEFAULT NULL,
  `VerticeTargetY` float DEFAULT NULL,
  `VerifiedBuild` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`AreaTriggerCreatePropertiesId`,`IsCustom`,`Idx`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.areatrigger_create_properties_spline_point
CREATE TABLE IF NOT EXISTS `areatrigger_create_properties_spline_point` (
  `AreaTriggerCreatePropertiesId` int unsigned NOT NULL,
  `IsCustom` tinyint unsigned NOT NULL,
  `Idx` int unsigned NOT NULL,
  `X` float NOT NULL DEFAULT '0',
  `Y` float NOT NULL DEFAULT '0',
  `Z` float NOT NULL DEFAULT '0',
  `VerifiedBuild` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`AreaTriggerCreatePropertiesId`,`IsCustom`,`Idx`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.areatrigger_involvedrelation
CREATE TABLE IF NOT EXISTS `areatrigger_involvedrelation` (
  `id` int unsigned NOT NULL DEFAULT '0' COMMENT 'Identifier',
  `quest` int unsigned NOT NULL DEFAULT '0' COMMENT 'Quest Identifier',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Trigger System';

-- Data exporting was unselected.

-- Dumping structure for table world.areatrigger_scripts
CREATE TABLE IF NOT EXISTS `areatrigger_scripts` (
  `entry` int NOT NULL,
  `ScriptName` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`entry`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.areatrigger_tavern
CREATE TABLE IF NOT EXISTS `areatrigger_tavern` (
  `id` int unsigned NOT NULL DEFAULT '0' COMMENT 'Identifier',
  `name` mediumtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Trigger System';

-- Data exporting was unselected.

-- Dumping structure for table world.areatrigger_teleport
CREATE TABLE IF NOT EXISTS `areatrigger_teleport` (
  `ID` int unsigned NOT NULL DEFAULT '0',
  `Name` mediumtext COLLATE utf8mb4_unicode_ci,
  `target_map` smallint unsigned NOT NULL DEFAULT '0',
  `target_position_x` float NOT NULL DEFAULT '0',
  `target_position_y` float NOT NULL DEFAULT '0',
  `target_position_z` float NOT NULL DEFAULT '0',
  `target_orientation` float NOT NULL DEFAULT '0',
  `VerifiedBuild` int DEFAULT NULL,
  PRIMARY KEY (`ID`),
  FULLTEXT KEY `name` (`Name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Trigger System';

-- Data exporting was unselected.

-- Dumping structure for table world.areatrigger_template
CREATE TABLE IF NOT EXISTS `areatrigger_template` (
  `Id` int unsigned NOT NULL,
  `IsCustom` tinyint unsigned NOT NULL,
  `Flags` int unsigned NOT NULL DEFAULT '0',
  `VerifiedBuild` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`Id`,`IsCustom`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.areatrigger_template_actions
CREATE TABLE IF NOT EXISTS `areatrigger_template_actions` (
  `AreaTriggerId` int unsigned NOT NULL,
  `IsCustom` tinyint unsigned NOT NULL,
  `ActionType` int unsigned NOT NULL,
  `ActionParam` int unsigned NOT NULL,
  `TargetType` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`AreaTriggerId`,`IsCustom`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.battlefield_template
CREATE TABLE IF NOT EXISTS `battlefield_template` (
  `TypeId` tinyint unsigned NOT NULL,
  `ScriptName` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`TypeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.battleground_template
CREATE TABLE IF NOT EXISTS `battleground_template` (
  `ID` int unsigned NOT NULL DEFAULT '0',
  `AllianceStartLoc` int unsigned NOT NULL,
  `HordeStartLoc` int unsigned NOT NULL,
  `StartMaxDist` float NOT NULL DEFAULT '0',
  `Weight` tinyint unsigned NOT NULL DEFAULT '1',
  `ScriptName` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `Comment` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.battlemaster_entry
CREATE TABLE IF NOT EXISTS `battlemaster_entry` (
  `entry` int unsigned NOT NULL DEFAULT '0' COMMENT 'Entry of a creature',
  `bg_template` int unsigned NOT NULL DEFAULT '0' COMMENT 'Battleground template id',
  PRIMARY KEY (`entry`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.battlepay_addon
CREATE TABLE IF NOT EXISTS `battlepay_addon` (
  `DisplayInfoEntry` int unsigned NOT NULL AUTO_INCREMENT,
  `DisableListing` int unsigned DEFAULT '0',
  `DisableBuy` int unsigned DEFAULT '0',
  `NameColorIndex` int unsigned DEFAULT '0',
  `ScriptName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  UNIQUE KEY `Entry` (`DisplayInfoEntry`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.battlepay_displayinfo
CREATE TABLE IF NOT EXISTS `battlepay_displayinfo` (
  `Entry` int unsigned NOT NULL AUTO_INCREMENT,
  `CreatureDisplayID` int unsigned DEFAULT '0',
  `VisualID` int unsigned DEFAULT '0',
  `Name1` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Name2` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `Name3` text COLLATE utf8mb4_unicode_ci,
  `Name4` text COLLATE utf8mb4_unicode_ci,
  `Name5` text COLLATE utf8mb4_unicode_ci,
  `Name6` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Name7` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Flags` int unsigned DEFAULT '0',
  `Unk1` int unsigned DEFAULT '0',
  `Unk2` int unsigned DEFAULT '0',
  `Unk3` int unsigned DEFAULT '0',
  `UnkInt1` int unsigned DEFAULT '0',
  `UnkInt2` int unsigned DEFAULT '0',
  `UnkInt3` int unsigned DEFAULT '0',
  UNIQUE KEY `Entry` (`Entry`)
) ENGINE=InnoDB AUTO_INCREMENT=85 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.battlepay_group
CREATE TABLE IF NOT EXISTS `battlepay_group` (
  `Entry` int unsigned NOT NULL AUTO_INCREMENT,
  `GroupID` int unsigned DEFAULT '0',
  `IconFileDataID` int unsigned DEFAULT '0',
  `DisplayType` int unsigned DEFAULT '0',
  `Ordering` int unsigned DEFAULT '0',
  `Unk` int unsigned DEFAULT '0',
  `MainGroupID` int unsigned DEFAULT '0',
  `Name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `Description` text COLLATE utf8mb4_unicode_ci,
  UNIQUE KEY `Entry` (`Entry`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.battlepay_item
CREATE TABLE IF NOT EXISTS `battlepay_item` (
  `Entry` int unsigned NOT NULL AUTO_INCREMENT,
  `ID` int unsigned DEFAULT '0',
  `UnkByte` int unsigned DEFAULT '0',
  `ItemID` int unsigned DEFAULT '0',
  `Quantity` int unsigned DEFAULT '0',
  `UnkInt1` int unsigned DEFAULT '0',
  `UnkInt2` int unsigned DEFAULT '0',
  `IsPet` int unsigned DEFAULT '0',
  `PetResult` int unsigned DEFAULT '0',
  `Display` int unsigned DEFAULT '0',
  UNIQUE KEY `Entry` (`Entry`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.battlepay_product
CREATE TABLE IF NOT EXISTS `battlepay_product` (
  `Entry` int unsigned NOT NULL AUTO_INCREMENT,
  `ProductID` int unsigned DEFAULT '0',
  `Type` int unsigned DEFAULT '0',
  `Flags` int unsigned DEFAULT '0',
  `Unk1` int unsigned DEFAULT '0',
  `DisplayId` int unsigned DEFAULT '0',
  `ItemId` int unsigned DEFAULT '0',
  `Unk4` int unsigned DEFAULT '0',
  `Unk5` int unsigned DEFAULT '0',
  `Unk6` int unsigned DEFAULT '0',
  `Unk7` int unsigned DEFAULT '0',
  `Unk8` int unsigned DEFAULT '0',
  `Unk9` int unsigned DEFAULT '0',
  `UnkString` int unsigned DEFAULT '0',
  `UnkBit` int unsigned DEFAULT '0',
  `UnkBits` int unsigned DEFAULT '0',
  `Name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  UNIQUE KEY `Entry` (`Entry`)
) ENGINE=InnoDB AUTO_INCREMENT=549 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.battlepay_productinfo
CREATE TABLE IF NOT EXISTS `battlepay_productinfo` (
  `Entry` int unsigned NOT NULL AUTO_INCREMENT,
  `ProductId` int unsigned DEFAULT '0',
  `NormalPriceFixedPoint` int unsigned DEFAULT '0',
  `CurrentPriceFixedPoint` int unsigned DEFAULT '0',
  `ProductIds` text COLLATE utf8mb4_unicode_ci,
  `Unk1` int unsigned DEFAULT '0',
  `Unk2` int unsigned DEFAULT '0',
  `UnkInts` int unsigned DEFAULT '0',
  `Unk3` int unsigned DEFAULT '0',
  `ChoiceType` int unsigned DEFAULT '0',
  UNIQUE KEY `Entry` (`Entry`)
) ENGINE=InnoDB AUTO_INCREMENT=546 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.battlepay_shop
CREATE TABLE IF NOT EXISTS `battlepay_shop` (
  `Entry` int unsigned NOT NULL AUTO_INCREMENT,
  `EntryID` int unsigned DEFAULT '0',
  `GroupID` int unsigned DEFAULT '0',
  `ProductID` int unsigned DEFAULT '0',
  `Ordering` int unsigned DEFAULT '0',
  `VasServiceType` int unsigned DEFAULT '0',
  `StoreDeliveryType` int unsigned DEFAULT '0',
  UNIQUE KEY `Entry` (`Entry`)
) ENGINE=InnoDB AUTO_INCREMENT=85 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.battlepay_visual
CREATE TABLE IF NOT EXISTS `battlepay_visual` (
  `Entry` int unsigned NOT NULL AUTO_INCREMENT,
  `DisplayInfoEntry` int unsigned DEFAULT '0',
  `Name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `DisplayId` int unsigned DEFAULT '0',
  `VisualId` int unsigned DEFAULT '0',
  `Unk` int unsigned DEFAULT '0',
  UNIQUE KEY `Entry` (`Entry`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.battlepet_info
CREATE TABLE IF NOT EXISTS `battlepet_info` (
  `NpcID` int unsigned NOT NULL,
  `Specie` int unsigned NOT NULL DEFAULT '0',
  `maxlevel` int unsigned NOT NULL DEFAULT '0',
  `minlevel` int unsigned NOT NULL DEFAULT '0',
  `minquality` int unsigned NOT NULL DEFAULT '0',
  `breadsMask` int unsigned NOT NULL DEFAULT '0',
  `Ability1` int unsigned NOT NULL DEFAULT '0',
  `Ability2` int unsigned NOT NULL DEFAULT '0',
  `Ability3` int unsigned NOT NULL DEFAULT '0',
  `Comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`NpcID`,`Specie`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=COMPACT;

-- Data exporting was unselected.

-- Dumping structure for table world.character_template
CREATE TABLE IF NOT EXISTS `character_template` (
  `Id` int unsigned NOT NULL,
  `Name` varchar(70) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Description` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Level` tinyint unsigned NOT NULL DEFAULT '1',
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.character_template_class
CREATE TABLE IF NOT EXISTS `character_template_class` (
  `TemplateId` int unsigned NOT NULL,
  `FactionGroup` tinyint unsigned NOT NULL COMMENT '3 - Alliance, 5 - Horde',
  `Class` tinyint unsigned NOT NULL,
  PRIMARY KEY (`TemplateId`,`FactionGroup`,`Class`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.class_expansion_requirement
CREATE TABLE IF NOT EXISTS `class_expansion_requirement` (
  `ClassID` tinyint unsigned NOT NULL,
  `RaceID` tinyint unsigned NOT NULL,
  `ActiveExpansionLevel` tinyint unsigned DEFAULT '0',
  `AccountExpansionLevel` tinyint unsigned DEFAULT '0',
  PRIMARY KEY (`ClassID`,`RaceID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.command
CREATE TABLE IF NOT EXISTS `command` (
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `help` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Chat System';

-- Data exporting was unselected.

-- Dumping structure for table world.conditions
CREATE TABLE IF NOT EXISTS `conditions` (
  `SourceTypeOrReferenceId` int NOT NULL DEFAULT '0',
  `SourceGroup` int unsigned NOT NULL DEFAULT '0',
  `SourceEntry` int NOT NULL DEFAULT '0',
  `SourceId` int NOT NULL DEFAULT '0',
  `ElseGroup` int unsigned NOT NULL DEFAULT '0',
  `ConditionTypeOrReference` int NOT NULL DEFAULT '0',
  `ConditionTarget` tinyint unsigned NOT NULL DEFAULT '0',
  `ConditionValue1` int unsigned NOT NULL DEFAULT '0',
  `ConditionValue2` int unsigned NOT NULL DEFAULT '0',
  `ConditionValue3` int unsigned NOT NULL DEFAULT '0',
  `ConditionStringValue1` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `NegativeCondition` tinyint unsigned NOT NULL DEFAULT '0',
  `ErrorType` int unsigned NOT NULL DEFAULT '0',
  `ErrorTextId` int unsigned NOT NULL DEFAULT '0',
  `ScriptName` char(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `Comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`SourceTypeOrReferenceId`,`SourceGroup`,`SourceEntry`,`SourceId`,`ElseGroup`,`ConditionTypeOrReference`,`ConditionTarget`,`ConditionValue1`,`ConditionValue2`,`ConditionValue3`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Condition System';

-- Data exporting was unselected.

-- Dumping structure for table world.conversation_actors
CREATE TABLE IF NOT EXISTS `conversation_actors` (
  `ConversationId` int unsigned NOT NULL,
  `ConversationActorId` int unsigned NOT NULL DEFAULT '0',
  `ConversationActorGuid` bigint unsigned NOT NULL DEFAULT '0',
  `Idx` smallint unsigned NOT NULL DEFAULT '0',
  `CreatureId` int unsigned NOT NULL DEFAULT '0',
  `CreatureDisplayInfoId` int unsigned NOT NULL DEFAULT '0',
  `NoActorObject` tinyint unsigned DEFAULT '0',
  `ActivePlayerObject` tinyint unsigned DEFAULT '0',
  `VerifiedBuild` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`ConversationId`,`Idx`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.conversation_line_template
CREATE TABLE IF NOT EXISTS `conversation_line_template` (
  `Id` int unsigned NOT NULL,
  `UiCameraID` int unsigned NOT NULL DEFAULT '0',
  `ActorIdx` tinyint unsigned NOT NULL DEFAULT '0',
  `Flags` tinyint unsigned NOT NULL DEFAULT '0',
  `ChatType` tinyint unsigned NOT NULL DEFAULT '0',
  `VerifiedBuild` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.conversation_template
CREATE TABLE IF NOT EXISTS `conversation_template` (
  `Id` int unsigned NOT NULL,
  `FirstLineId` int unsigned NOT NULL,
  `TextureKitId` int unsigned NOT NULL DEFAULT '0',
  `Flags` tinyint NOT NULL DEFAULT '0',
  `ScriptName` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `VerifiedBuild` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.creature
CREATE TABLE IF NOT EXISTS `creature` (
  `guid` bigint unsigned NOT NULL DEFAULT '0',
  `id` int unsigned NOT NULL DEFAULT '0' COMMENT 'Creature Identifier',
  `map` smallint unsigned NOT NULL DEFAULT '0' COMMENT 'Map Identifier',
  `zoneId` smallint unsigned NOT NULL DEFAULT '0' COMMENT 'Zone Identifier',
  `areaId` smallint unsigned NOT NULL DEFAULT '0' COMMENT 'Area Identifier',
  `spawnDifficulties` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0',
  `phaseUseFlags` tinyint unsigned NOT NULL DEFAULT '0',
  `PhaseId` int DEFAULT '0',
  `PhaseGroup` int DEFAULT '0',
  `terrainSwapMap` int NOT NULL DEFAULT '-1',
  `modelid` int unsigned NOT NULL DEFAULT '0',
  `equipment_id` tinyint NOT NULL DEFAULT '0',
  `position_x` float NOT NULL DEFAULT '0',
  `position_y` float NOT NULL DEFAULT '0',
  `position_z` float NOT NULL DEFAULT '0',
  `orientation` float NOT NULL DEFAULT '0',
  `spawntimesecs` int unsigned NOT NULL DEFAULT '120',
  `wander_distance` float NOT NULL DEFAULT '0',
  `currentwaypoint` int unsigned NOT NULL DEFAULT '0',
  `curhealth` int unsigned NOT NULL DEFAULT '1',
  `curmana` int unsigned NOT NULL DEFAULT '0',
  `MovementType` tinyint unsigned NOT NULL DEFAULT '0',
  `npcflag` bigint unsigned DEFAULT NULL,
  `unit_flags` int unsigned DEFAULT NULL,
  `unit_flags2` int unsigned DEFAULT NULL,
  `unit_flags3` int unsigned DEFAULT NULL,
  `ScriptName` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `StringId` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`guid`),
  KEY `idx_map` (`map`),
  KEY `idx_id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Creature System';

-- Data exporting was unselected.

-- Dumping structure for table world.creature_addon
CREATE TABLE IF NOT EXISTS `creature_addon` (
  `guid` bigint unsigned NOT NULL DEFAULT '0',
  `path_id` int unsigned NOT NULL DEFAULT '0',
  `mount` int unsigned NOT NULL DEFAULT '0',
  `MountCreatureID` int unsigned NOT NULL DEFAULT '0',
  `StandState` tinyint unsigned NOT NULL DEFAULT '0',
  `AnimTier` tinyint unsigned NOT NULL DEFAULT '0',
  `VisFlags` tinyint unsigned NOT NULL DEFAULT '0',
  `SheathState` tinyint unsigned NOT NULL DEFAULT '1',
  `PvPFlags` tinyint unsigned NOT NULL DEFAULT '0',
  `emote` int unsigned NOT NULL DEFAULT '0',
  `aiAnimKit` smallint NOT NULL DEFAULT '0',
  `movementAnimKit` smallint NOT NULL DEFAULT '0',
  `meleeAnimKit` smallint NOT NULL DEFAULT '0',
  `visibilityDistanceType` tinyint unsigned NOT NULL DEFAULT '0',
  `auras` mediumtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`guid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.creature_classlevelstats
CREATE TABLE IF NOT EXISTS `creature_classlevelstats` (
  `level` tinyint unsigned NOT NULL,
  `class` tinyint unsigned NOT NULL,
  `basehp0` smallint unsigned NOT NULL DEFAULT '1',
  `basehp1` smallint unsigned NOT NULL DEFAULT '1',
  `basehp2` smallint unsigned NOT NULL DEFAULT '1',
  `basemana` smallint unsigned NOT NULL DEFAULT '0',
  `basearmor` smallint unsigned NOT NULL DEFAULT '1',
  `attackpower` smallint unsigned NOT NULL DEFAULT '0',
  `rangedattackpower` smallint unsigned NOT NULL DEFAULT '0',
  `damage_base` float NOT NULL DEFAULT '0',
  `damage_exp1` float NOT NULL DEFAULT '0',
  `damage_exp2` float NOT NULL DEFAULT '0',
  `comment` mediumtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`level`,`class`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.creature_equip_template
CREATE TABLE IF NOT EXISTS `creature_equip_template` (
  `CreatureID` int unsigned NOT NULL DEFAULT '0',
  `ID` tinyint unsigned NOT NULL DEFAULT '1',
  `ItemID1` int unsigned NOT NULL DEFAULT '0',
  `AppearanceModID1` smallint unsigned NOT NULL DEFAULT '0',
  `ItemVisual1` smallint unsigned NOT NULL DEFAULT '0',
  `ItemID2` int unsigned NOT NULL DEFAULT '0',
  `AppearanceModID2` smallint unsigned NOT NULL DEFAULT '0',
  `ItemVisual2` smallint unsigned NOT NULL DEFAULT '0',
  `ItemID3` int unsigned NOT NULL DEFAULT '0',
  `AppearanceModID3` smallint unsigned NOT NULL DEFAULT '0',
  `ItemVisual3` smallint unsigned NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`CreatureID`,`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.creature_formations
CREATE TABLE IF NOT EXISTS `creature_formations` (
  `leaderGUID` bigint unsigned NOT NULL DEFAULT '0',
  `memberGUID` bigint unsigned NOT NULL DEFAULT '0',
  `dist` float NOT NULL,
  `angle` float NOT NULL,
  `groupAI` int unsigned NOT NULL,
  `point_1` smallint unsigned NOT NULL DEFAULT '0',
  `point_2` smallint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`memberGUID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.creature_loot_template
CREATE TABLE IF NOT EXISTS `creature_loot_template` (
  `Entry` int unsigned NOT NULL DEFAULT '0',
  `Item` int unsigned NOT NULL DEFAULT '0',
  `Reference` int unsigned NOT NULL DEFAULT '0',
  `Chance` float NOT NULL DEFAULT '100',
  `QuestRequired` tinyint(1) NOT NULL DEFAULT '0',
  `LootMode` smallint unsigned NOT NULL DEFAULT '1',
  `GroupId` tinyint unsigned NOT NULL DEFAULT '0',
  `MinCount` tinyint unsigned NOT NULL DEFAULT '1',
  `MaxCount` tinyint unsigned NOT NULL DEFAULT '1',
  `Comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`Entry`,`Item`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Loot System';

-- Data exporting was unselected.

-- Dumping structure for table world.creature_model_info
CREATE TABLE IF NOT EXISTS `creature_model_info` (
  `DisplayID` int unsigned NOT NULL DEFAULT '0',
  `BoundingRadius` float NOT NULL DEFAULT '0',
  `CombatReach` float NOT NULL DEFAULT '0',
  `DisplayID_Other_Gender` int unsigned NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`DisplayID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Creature System (Model related info)';

-- Data exporting was unselected.

-- Dumping structure for table world.creature_movement_info
CREATE TABLE IF NOT EXISTS `creature_movement_info` (
  `MovementID` int unsigned NOT NULL DEFAULT '0' COMMENT 'creature_template.movementId value',
  `WalkSpeed` float DEFAULT NULL,
  `RunSpeed` float DEFAULT NULL,
  PRIMARY KEY (`MovementID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.creature_movement_override
CREATE TABLE IF NOT EXISTS `creature_movement_override` (
  `SpawnId` bigint unsigned NOT NULL DEFAULT '0',
  `Ground` tinyint unsigned DEFAULT NULL,
  `Swim` tinyint unsigned DEFAULT NULL,
  `Flight` tinyint unsigned DEFAULT NULL,
  `Rooted` tinyint unsigned DEFAULT NULL,
  `Chase` tinyint unsigned DEFAULT NULL,
  `Random` tinyint unsigned DEFAULT NULL,
  `InteractionPauseTimer` int unsigned DEFAULT NULL COMMENT 'Time (in milliseconds) during which creature will not move after interaction with player',
  PRIMARY KEY (`SpawnId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.creature_onkill_reputation
CREATE TABLE IF NOT EXISTS `creature_onkill_reputation` (
  `creature_id` int unsigned NOT NULL DEFAULT '0' COMMENT 'Creature Identifier',
  `RewOnKillRepFaction1` smallint NOT NULL DEFAULT '0',
  `RewOnKillRepFaction2` smallint NOT NULL DEFAULT '0',
  `MaxStanding1` tinyint NOT NULL DEFAULT '0',
  `IsTeamAward1` tinyint NOT NULL DEFAULT '0',
  `RewOnKillRepValue1` int NOT NULL DEFAULT '0',
  `MaxStanding2` tinyint NOT NULL DEFAULT '0',
  `IsTeamAward2` tinyint NOT NULL DEFAULT '0',
  `RewOnKillRepValue2` int NOT NULL DEFAULT '0',
  `TeamDependent` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`creature_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Creature OnKill Reputation gain';

-- Data exporting was unselected.

-- Dumping structure for table world.creature_questender
CREATE TABLE IF NOT EXISTS `creature_questender` (
  `id` int unsigned NOT NULL DEFAULT '0' COMMENT 'Identifier',
  `quest` int unsigned NOT NULL DEFAULT '0' COMMENT 'Quest Identifier',
  `VerifiedBuild` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`,`quest`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Creature System';

-- Data exporting was unselected.

-- Dumping structure for table world.creature_questitem
CREATE TABLE IF NOT EXISTS `creature_questitem` (
  `CreatureEntry` int unsigned NOT NULL DEFAULT '0',
  `DifficultyID` tinyint unsigned NOT NULL DEFAULT '0',
  `Idx` int unsigned NOT NULL DEFAULT '0',
  `ItemId` int unsigned NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`CreatureEntry`,`DifficultyID`,`Idx`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.creature_queststarter
CREATE TABLE IF NOT EXISTS `creature_queststarter` (
  `id` int unsigned NOT NULL DEFAULT '0' COMMENT 'Identifier',
  `quest` int unsigned NOT NULL DEFAULT '0' COMMENT 'Quest Identifier',
  `VerifiedBuild` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`,`quest`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Creature System';

-- Data exporting was unselected.

-- Dumping structure for table world.creature_summoned_data
CREATE TABLE IF NOT EXISTS `creature_summoned_data` (
  `CreatureID` int unsigned NOT NULL,
  `CreatureIDVisibleToSummoner` int DEFAULT NULL,
  `GroundMountDisplayID` int unsigned DEFAULT NULL,
  `FlyingMountDisplayID` int unsigned DEFAULT NULL,
  `DespawnOnQuestsRemoved` mediumtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`CreatureID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.creature_summon_groups
CREATE TABLE IF NOT EXISTS `creature_summon_groups` (
  `summonerId` int unsigned NOT NULL DEFAULT '0',
  `summonerType` tinyint unsigned NOT NULL DEFAULT '0',
  `groupId` tinyint unsigned NOT NULL DEFAULT '0',
  `entry` int unsigned NOT NULL DEFAULT '0',
  `position_x` float NOT NULL DEFAULT '0',
  `position_y` float NOT NULL DEFAULT '0',
  `position_z` float NOT NULL DEFAULT '0',
  `orientation` float NOT NULL DEFAULT '0',
  `summonType` tinyint unsigned NOT NULL DEFAULT '0',
  `summonTime` int unsigned NOT NULL DEFAULT '0',
  `Comment` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.creature_template
CREATE TABLE IF NOT EXISTS `creature_template` (
  `entry` int unsigned NOT NULL DEFAULT '0',
  `KillCredit1` int unsigned NOT NULL DEFAULT '0',
  `KillCredit2` int unsigned NOT NULL DEFAULT '0',
  `name` mediumtext COLLATE utf8mb4_unicode_ci,
  `femaleName` mediumtext COLLATE utf8mb4_unicode_ci,
  `subname` mediumtext COLLATE utf8mb4_unicode_ci,
  `TitleAlt` mediumtext COLLATE utf8mb4_unicode_ci,
  `IconName` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `RequiredExpansion` int NOT NULL DEFAULT '0',
  `VignetteID` int NOT NULL DEFAULT '0',
  `faction` smallint unsigned NOT NULL DEFAULT '0',
  `npcflag` bigint unsigned NOT NULL DEFAULT '0',
  `speed_walk` float NOT NULL DEFAULT '1' COMMENT 'Result of 2.5/2.5, most common value',
  `speed_run` float NOT NULL DEFAULT '1.14286' COMMENT 'Result of 8.0/7.0, most common value',
  `scale` float NOT NULL DEFAULT '1',
  `Classification` tinyint unsigned NOT NULL DEFAULT '0',
  `dmgschool` tinyint NOT NULL DEFAULT '0',
  `BaseAttackTime` int unsigned NOT NULL DEFAULT '0',
  `RangeAttackTime` int unsigned NOT NULL DEFAULT '0',
  `BaseVariance` float NOT NULL DEFAULT '1',
  `RangeVariance` float NOT NULL DEFAULT '1',
  `unit_class` tinyint unsigned NOT NULL DEFAULT '0',
  `unit_flags` int unsigned NOT NULL DEFAULT '0',
  `unit_flags2` int unsigned NOT NULL DEFAULT '0',
  `unit_flags3` int unsigned NOT NULL DEFAULT '0',
  `family` int NOT NULL DEFAULT '0',
  `trainer_class` tinyint unsigned NOT NULL DEFAULT '0',
  `type` tinyint unsigned NOT NULL DEFAULT '0',
  `PetSpellDataId` int unsigned NOT NULL DEFAULT '0',
  `VehicleId` int unsigned NOT NULL DEFAULT '0',
  `AIName` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `MovementType` tinyint unsigned NOT NULL DEFAULT '0',
  `ExperienceModifier` float NOT NULL DEFAULT '1',
  `Civilian` tinyint unsigned NOT NULL DEFAULT '0',
  `RacialLeader` tinyint unsigned NOT NULL DEFAULT '0',
  `movementId` int unsigned NOT NULL DEFAULT '0',
  `WidgetSetID` int NOT NULL DEFAULT '0',
  `WidgetSetUnitConditionID` int NOT NULL DEFAULT '0',
  `RegenHealth` tinyint unsigned NOT NULL DEFAULT '1',
  `mechanic_immune_mask` bigint unsigned NOT NULL DEFAULT '0',
  `spell_school_immune_mask` int unsigned NOT NULL DEFAULT '0',
  `flags_extra` int unsigned NOT NULL DEFAULT '0',
  `ScriptName` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `StringId` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`entry`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Creature System';

-- Data exporting was unselected.

-- Dumping structure for table world.creature_template_addon
CREATE TABLE IF NOT EXISTS `creature_template_addon` (
  `entry` int unsigned NOT NULL DEFAULT '0',
  `path_id` int unsigned NOT NULL DEFAULT '0',
  `mount` int unsigned NOT NULL DEFAULT '0',
  `MountCreatureID` int unsigned NOT NULL DEFAULT '0',
  `StandState` tinyint unsigned NOT NULL DEFAULT '0',
  `AnimTier` tinyint unsigned NOT NULL DEFAULT '0',
  `VisFlags` tinyint unsigned NOT NULL DEFAULT '0',
  `SheathState` tinyint unsigned NOT NULL DEFAULT '1',
  `PvPFlags` tinyint unsigned NOT NULL DEFAULT '0',
  `emote` int unsigned NOT NULL DEFAULT '0',
  `aiAnimKit` smallint NOT NULL DEFAULT '0',
  `movementAnimKit` smallint NOT NULL DEFAULT '0',
  `meleeAnimKit` smallint NOT NULL DEFAULT '0',
  `visibilityDistanceType` tinyint unsigned NOT NULL DEFAULT '0',
  `auras` mediumtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`entry`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.creature_template_difficulty
CREATE TABLE IF NOT EXISTS `creature_template_difficulty` (
  `Entry` int unsigned NOT NULL,
  `DifficultyID` tinyint unsigned NOT NULL DEFAULT '0',
  `MinLevel` tinyint NOT NULL DEFAULT '1',
  `MaxLevel` tinyint NOT NULL DEFAULT '1',
  `HealthScalingExpansion` int NOT NULL DEFAULT '0',
  `HealthModifier` float NOT NULL DEFAULT '1',
  `ManaModifier` float NOT NULL DEFAULT '1',
  `ArmorModifier` float NOT NULL DEFAULT '1',
  `DamageModifier` float NOT NULL DEFAULT '1',
  `CreatureDifficultyID` int NOT NULL DEFAULT '0',
  `TypeFlags` int unsigned NOT NULL DEFAULT '0',
  `TypeFlags2` int unsigned NOT NULL DEFAULT '0',
  `LootID` int unsigned NOT NULL DEFAULT '0',
  `PickPocketLootID` int unsigned NOT NULL DEFAULT '0',
  `SkinLootID` int unsigned NOT NULL DEFAULT '0',
  `GoldMin` int unsigned NOT NULL DEFAULT '0',
  `GoldMax` int unsigned NOT NULL DEFAULT '0',
  `StaticFlags1` int unsigned NOT NULL DEFAULT '0',
  `StaticFlags2` int unsigned NOT NULL DEFAULT '0',
  `StaticFlags3` int unsigned NOT NULL DEFAULT '0',
  `StaticFlags4` int unsigned NOT NULL DEFAULT '0',
  `StaticFlags5` int unsigned NOT NULL DEFAULT '0',
  `StaticFlags6` int unsigned NOT NULL DEFAULT '0',
  `StaticFlags7` int unsigned NOT NULL DEFAULT '0',
  `StaticFlags8` int unsigned NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`Entry`,`DifficultyID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.creature_template_difficulty_old
CREATE TABLE IF NOT EXISTS `creature_template_difficulty_old` (
  `Entry` int unsigned NOT NULL,
  `DifficultyID` tinyint unsigned NOT NULL DEFAULT '0',
  `MinLevel` tinyint NOT NULL DEFAULT '1',
  `MaxLevel` tinyint NOT NULL DEFAULT '1',
  `HealthScalingExpansion` int NOT NULL DEFAULT '0',
  `HealthModifier` float NOT NULL DEFAULT '1',
  `ManaModifier` float NOT NULL DEFAULT '1',
  `ArmorModifier` float NOT NULL DEFAULT '1',
  `DamageModifier` float NOT NULL DEFAULT '1',
  `CreatureDifficultyID` int NOT NULL DEFAULT '0',
  `TypeFlags` int unsigned NOT NULL DEFAULT '0',
  `TypeFlags2` int unsigned NOT NULL DEFAULT '0',
  `LootID` int unsigned NOT NULL DEFAULT '0',
  `PickPocketLootID` int unsigned NOT NULL DEFAULT '0',
  `SkinLootID` int unsigned NOT NULL DEFAULT '0',
  `GoldMin` int unsigned NOT NULL DEFAULT '0',
  `GoldMax` int unsigned NOT NULL DEFAULT '0',
  `StaticFlags1` int unsigned NOT NULL DEFAULT '0',
  `StaticFlags2` int unsigned NOT NULL DEFAULT '0',
  `StaticFlags3` int unsigned NOT NULL DEFAULT '0',
  `StaticFlags4` int unsigned NOT NULL DEFAULT '0',
  `StaticFlags5` int unsigned NOT NULL DEFAULT '0',
  `StaticFlags6` int unsigned NOT NULL DEFAULT '0',
  `StaticFlags7` int unsigned NOT NULL DEFAULT '0',
  `StaticFlags8` int unsigned NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`Entry`,`DifficultyID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.creature_template_gossip
CREATE TABLE IF NOT EXISTS `creature_template_gossip` (
  `CreatureID` int unsigned NOT NULL,
  `MenuID` int unsigned NOT NULL,
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`CreatureID`,`MenuID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.creature_template_locale
CREATE TABLE IF NOT EXISTS `creature_template_locale` (
  `entry` int unsigned NOT NULL DEFAULT '0',
  `locale` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Name` mediumtext COLLATE utf8mb4_unicode_ci,
  `NameAlt` mediumtext COLLATE utf8mb4_unicode_ci,
  `Title` mediumtext COLLATE utf8mb4_unicode_ci,
  `TitleAlt` mediumtext COLLATE utf8mb4_unicode_ci,
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`entry`,`locale`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.creature_template_model
CREATE TABLE IF NOT EXISTS `creature_template_model` (
  `CreatureID` int unsigned NOT NULL,
  `Idx` int unsigned NOT NULL DEFAULT '0',
  `CreatureDisplayID` int unsigned NOT NULL,
  `DisplayScale` float NOT NULL DEFAULT '1',
  `Probability` float NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`CreatureID`,`Idx`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.creature_template_movement
CREATE TABLE IF NOT EXISTS `creature_template_movement` (
  `CreatureId` int unsigned NOT NULL DEFAULT '0',
  `Ground` tinyint unsigned DEFAULT NULL,
  `Swim` tinyint unsigned DEFAULT NULL,
  `Flight` tinyint unsigned DEFAULT NULL,
  `Rooted` tinyint unsigned DEFAULT NULL,
  `Chase` tinyint unsigned DEFAULT NULL,
  `Random` tinyint unsigned DEFAULT NULL,
  `InteractionPauseTimer` int unsigned DEFAULT NULL COMMENT 'Time (in milliseconds) during which creature will not move after interaction with player',
  PRIMARY KEY (`CreatureId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.creature_template_resistance
CREATE TABLE IF NOT EXISTS `creature_template_resistance` (
  `CreatureID` int unsigned NOT NULL,
  `School` tinyint unsigned NOT NULL,
  `Resistance` smallint NOT NULL,
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`CreatureID`,`School`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.creature_template_sparring
CREATE TABLE IF NOT EXISTS `creature_template_sparring` (
  `Entry` int unsigned NOT NULL,
  `NoNPCDamageBelowHealthPct` float NOT NULL,
  PRIMARY KEY (`Entry`,`NoNPCDamageBelowHealthPct`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.creature_template_spell
CREATE TABLE IF NOT EXISTS `creature_template_spell` (
  `CreatureID` int unsigned NOT NULL,
  `Index` tinyint unsigned NOT NULL DEFAULT '0',
  `Spell` int unsigned NOT NULL,
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`CreatureID`,`Index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.creature_text
CREATE TABLE IF NOT EXISTS `creature_text` (
  `CreatureID` int unsigned NOT NULL DEFAULT '0',
  `GroupID` tinyint unsigned NOT NULL DEFAULT '0',
  `ID` tinyint unsigned NOT NULL DEFAULT '0',
  `Text` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `Type` tinyint unsigned NOT NULL DEFAULT '0',
  `Language` tinyint NOT NULL DEFAULT '0',
  `Probability` float NOT NULL DEFAULT '0',
  `Emote` int unsigned NOT NULL DEFAULT '0',
  `Duration` int unsigned NOT NULL DEFAULT '0',
  `Sound` int unsigned NOT NULL DEFAULT '0',
  `SoundPlayType` tinyint unsigned NOT NULL DEFAULT '0',
  `BroadcastTextId` int NOT NULL DEFAULT '0',
  `TextRange` tinyint unsigned NOT NULL DEFAULT '0',
  `comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '',
  PRIMARY KEY (`CreatureID`,`GroupID`,`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.creature_text_locale
CREATE TABLE IF NOT EXISTS `creature_text_locale` (
  `CreatureID` int unsigned NOT NULL DEFAULT '0',
  `GroupID` tinyint unsigned NOT NULL DEFAULT '0',
  `ID` tinyint unsigned NOT NULL DEFAULT '0',
  `Locale` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Text` mediumtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`CreatureID`,`GroupID`,`ID`,`Locale`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.creature_trainer
CREATE TABLE IF NOT EXISTS `creature_trainer` (
  `CreatureID` int unsigned NOT NULL DEFAULT '0',
  `TrainerID` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`CreatureID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.criteria_data
CREATE TABLE IF NOT EXISTS `criteria_data` (
  `criteria_id` int NOT NULL,
  `type` tinyint unsigned NOT NULL DEFAULT '0',
  `value1` int unsigned NOT NULL DEFAULT '0',
  `value2` int unsigned NOT NULL DEFAULT '0',
  `ScriptName` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`criteria_id`,`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Achievment system';

-- Data exporting was unselected.

-- Dumping structure for table world.disables
CREATE TABLE IF NOT EXISTS `disables` (
  `sourceType` int unsigned NOT NULL,
  `entry` int unsigned NOT NULL,
  `flags` smallint NOT NULL,
  `params_0` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `params_1` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `comment` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`sourceType`,`entry`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.disenchant_loot_template
CREATE TABLE IF NOT EXISTS `disenchant_loot_template` (
  `Entry` int unsigned NOT NULL DEFAULT '0',
  `Item` int unsigned NOT NULL DEFAULT '0',
  `Reference` int unsigned NOT NULL DEFAULT '0',
  `Chance` float NOT NULL DEFAULT '100',
  `QuestRequired` tinyint(1) NOT NULL DEFAULT '0',
  `LootMode` smallint unsigned NOT NULL DEFAULT '1',
  `GroupId` tinyint unsigned NOT NULL DEFAULT '0',
  `MinCount` tinyint unsigned NOT NULL DEFAULT '1',
  `MaxCount` tinyint unsigned NOT NULL DEFAULT '1',
  `Comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`Entry`,`Item`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Loot System';

-- Data exporting was unselected.

-- Dumping structure for table world.event_scripts
CREATE TABLE IF NOT EXISTS `event_scripts` (
  `id` int unsigned NOT NULL DEFAULT '0',
  `delay` int unsigned NOT NULL DEFAULT '0',
  `command` int unsigned NOT NULL DEFAULT '0',
  `datalong` int unsigned NOT NULL DEFAULT '0',
  `datalong2` int unsigned NOT NULL DEFAULT '0',
  `dataint` int NOT NULL DEFAULT '0',
  `x` float NOT NULL DEFAULT '0',
  `y` float NOT NULL DEFAULT '0',
  `z` float NOT NULL DEFAULT '0',
  `o` float NOT NULL DEFAULT '0',
  `Comment` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.event_script_names
CREATE TABLE IF NOT EXISTS `event_script_names` (
  `Id` int unsigned NOT NULL,
  `ScriptName` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.exploration_basexp
CREATE TABLE IF NOT EXISTS `exploration_basexp` (
  `level` tinyint unsigned NOT NULL DEFAULT '0',
  `basexp` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Exploration System';

-- Data exporting was unselected.

-- Dumping structure for table world.fishing_loot_template
CREATE TABLE IF NOT EXISTS `fishing_loot_template` (
  `Entry` int unsigned NOT NULL DEFAULT '0',
  `Item` int unsigned NOT NULL DEFAULT '0',
  `Reference` int unsigned NOT NULL DEFAULT '0',
  `Chance` float NOT NULL DEFAULT '100',
  `QuestRequired` tinyint(1) NOT NULL DEFAULT '0',
  `LootMode` smallint unsigned NOT NULL DEFAULT '1',
  `GroupId` tinyint unsigned NOT NULL DEFAULT '0',
  `MinCount` tinyint unsigned NOT NULL DEFAULT '1',
  `MaxCount` tinyint unsigned NOT NULL DEFAULT '1',
  `Comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`Entry`,`Item`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Loot System';

-- Data exporting was unselected.

-- Dumping structure for table world.gameobject
CREATE TABLE IF NOT EXISTS `gameobject` (
  `guid` bigint unsigned NOT NULL DEFAULT '0',
  `id` int unsigned NOT NULL DEFAULT '0' COMMENT 'Gameobject Identifier',
  `map` smallint unsigned NOT NULL DEFAULT '0' COMMENT 'Map Identifier',
  `zoneId` smallint unsigned NOT NULL DEFAULT '0' COMMENT 'Zone Identifier',
  `areaId` smallint unsigned NOT NULL DEFAULT '0' COMMENT 'Area Identifier',
  `spawnDifficulties` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0',
  `phaseUseFlags` tinyint unsigned NOT NULL DEFAULT '0',
  `PhaseId` int DEFAULT '0',
  `PhaseGroup` int DEFAULT '0',
  `terrainSwapMap` int NOT NULL DEFAULT '-1',
  `position_x` float NOT NULL DEFAULT '0',
  `position_y` float NOT NULL DEFAULT '0',
  `position_z` float NOT NULL DEFAULT '0',
  `orientation` float NOT NULL DEFAULT '0',
  `rotation0` float NOT NULL DEFAULT '0',
  `rotation1` float NOT NULL DEFAULT '0',
  `rotation2` float NOT NULL DEFAULT '0',
  `rotation3` float NOT NULL DEFAULT '0',
  `spawntimesecs` int NOT NULL DEFAULT '0',
  `animprogress` tinyint unsigned NOT NULL DEFAULT '0',
  `state` tinyint unsigned NOT NULL DEFAULT '0',
  `ScriptName` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `StringId` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`guid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Gameobject System';

-- Data exporting was unselected.

-- Dumping structure for table world.gameobject_addon
CREATE TABLE IF NOT EXISTS `gameobject_addon` (
  `guid` bigint unsigned NOT NULL DEFAULT '0',
  `parent_rotation0` float NOT NULL DEFAULT '0',
  `parent_rotation1` float NOT NULL DEFAULT '0',
  `parent_rotation2` float NOT NULL DEFAULT '0',
  `parent_rotation3` float NOT NULL DEFAULT '1',
  `invisibilityType` tinyint unsigned NOT NULL DEFAULT '0',
  `invisibilityValue` int unsigned NOT NULL DEFAULT '0',
  `WorldEffectID` int unsigned NOT NULL DEFAULT '0',
  `AIAnimKitID` int unsigned NOT NULL DEFAULT '0',
  `size` float unsigned DEFAULT '0',
  PRIMARY KEY (`guid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.gameobject_loot_template
CREATE TABLE IF NOT EXISTS `gameobject_loot_template` (
  `Entry` int unsigned NOT NULL DEFAULT '0',
  `Item` int unsigned NOT NULL DEFAULT '0',
  `Reference` int unsigned NOT NULL DEFAULT '0',
  `Chance` float NOT NULL DEFAULT '100',
  `QuestRequired` tinyint(1) NOT NULL DEFAULT '0',
  `LootMode` smallint unsigned NOT NULL DEFAULT '1',
  `GroupId` tinyint unsigned NOT NULL DEFAULT '0',
  `MinCount` tinyint unsigned NOT NULL DEFAULT '1',
  `MaxCount` tinyint unsigned NOT NULL DEFAULT '1',
  `Comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`Entry`,`Item`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Loot System';

-- Data exporting was unselected.

-- Dumping structure for table world.gameobject_overrides
CREATE TABLE IF NOT EXISTS `gameobject_overrides` (
  `spawnId` bigint unsigned NOT NULL DEFAULT '0',
  `faction` smallint unsigned NOT NULL DEFAULT '0',
  `flags` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`spawnId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.gameobject_questender
CREATE TABLE IF NOT EXISTS `gameobject_questender` (
  `id` int unsigned NOT NULL DEFAULT '0',
  `quest` int unsigned NOT NULL DEFAULT '0' COMMENT 'Quest Identifier',
  `VerifiedBuild` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`,`quest`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.gameobject_questitem
CREATE TABLE IF NOT EXISTS `gameobject_questitem` (
  `GameObjectEntry` int unsigned NOT NULL DEFAULT '0',
  `Idx` int unsigned NOT NULL DEFAULT '0',
  `ItemId` int unsigned NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`GameObjectEntry`,`Idx`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.gameobject_queststarter
CREATE TABLE IF NOT EXISTS `gameobject_queststarter` (
  `id` int unsigned NOT NULL DEFAULT '0',
  `quest` int unsigned NOT NULL DEFAULT '0' COMMENT 'Quest Identifier',
  `VerifiedBuild` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`,`quest`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.gameobject_template
CREATE TABLE IF NOT EXISTS `gameobject_template` (
  `entry` int unsigned NOT NULL DEFAULT '0',
  `type` tinyint unsigned NOT NULL DEFAULT '0',
  `displayId` int unsigned NOT NULL DEFAULT '0',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `IconName` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `castBarCaption` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `unk1` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `size` float NOT NULL DEFAULT '1',
  `Data0` int NOT NULL DEFAULT '0',
  `Data1` int NOT NULL DEFAULT '0',
  `Data2` int NOT NULL DEFAULT '0',
  `Data3` int NOT NULL DEFAULT '0',
  `Data4` int NOT NULL DEFAULT '0',
  `Data5` int NOT NULL DEFAULT '0',
  `Data6` int NOT NULL DEFAULT '0',
  `Data7` int NOT NULL DEFAULT '0',
  `Data8` int NOT NULL DEFAULT '0',
  `Data9` int NOT NULL DEFAULT '0',
  `Data10` int NOT NULL DEFAULT '0',
  `Data11` int NOT NULL DEFAULT '0',
  `Data12` int NOT NULL DEFAULT '0',
  `Data13` int NOT NULL DEFAULT '0',
  `Data14` int NOT NULL DEFAULT '0',
  `Data15` int NOT NULL DEFAULT '0',
  `Data16` int NOT NULL DEFAULT '0',
  `Data17` int NOT NULL DEFAULT '0',
  `Data18` int NOT NULL DEFAULT '0',
  `Data19` int NOT NULL DEFAULT '0',
  `Data20` int NOT NULL DEFAULT '0',
  `Data21` int NOT NULL DEFAULT '0',
  `Data22` int NOT NULL DEFAULT '0',
  `Data23` int NOT NULL DEFAULT '0',
  `Data24` int NOT NULL DEFAULT '0',
  `Data25` int NOT NULL DEFAULT '0',
  `Data26` int NOT NULL DEFAULT '0',
  `Data27` int NOT NULL DEFAULT '0',
  `Data28` int NOT NULL DEFAULT '0',
  `Data29` int NOT NULL DEFAULT '0',
  `Data30` int NOT NULL DEFAULT '0',
  `Data31` int NOT NULL DEFAULT '0',
  `Data32` int NOT NULL DEFAULT '0',
  `Data33` int NOT NULL DEFAULT '0',
  `Data34` int NOT NULL DEFAULT '0',
  `ContentTuningId` int NOT NULL DEFAULT '0',
  `AIName` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `ScriptName` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `StringId` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`entry`),
  KEY `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Gameobject System';

-- Data exporting was unselected.

-- Dumping structure for table world.gameobject_template_addon
CREATE TABLE IF NOT EXISTS `gameobject_template_addon` (
  `entry` int unsigned NOT NULL DEFAULT '0',
  `faction` smallint unsigned NOT NULL DEFAULT '0',
  `flags` int unsigned NOT NULL DEFAULT '0',
  `mingold` int unsigned NOT NULL DEFAULT '0',
  `maxgold` int unsigned NOT NULL DEFAULT '0',
  `artkit0` int NOT NULL DEFAULT '0',
  `artkit1` int NOT NULL DEFAULT '0',
  `artkit2` int NOT NULL DEFAULT '0',
  `artkit3` int NOT NULL DEFAULT '0',
  `artkit4` int NOT NULL DEFAULT '0',
  `WorldEffectID` int unsigned NOT NULL DEFAULT '0',
  `AIAnimKitID` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`entry`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.gameobject_template_locale
CREATE TABLE IF NOT EXISTS `gameobject_template_locale` (
  `entry` int unsigned NOT NULL DEFAULT '0',
  `locale` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` mediumtext COLLATE utf8mb4_unicode_ci,
  `castBarCaption` mediumtext COLLATE utf8mb4_unicode_ci,
  `unk1` mediumtext COLLATE utf8mb4_unicode_ci,
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`entry`,`locale`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.game_event
CREATE TABLE IF NOT EXISTS `game_event` (
  `eventEntry` tinyint unsigned NOT NULL COMMENT 'Entry of the game event',
  `start_time` timestamp NULL DEFAULT NULL COMMENT 'Absolute start date, the event will never start before',
  `end_time` timestamp NULL DEFAULT NULL COMMENT 'Absolute end date, the event will never start after',
  `occurence` bigint unsigned NOT NULL DEFAULT '5184000' COMMENT 'Delay in minutes between occurences of the event',
  `length` bigint unsigned NOT NULL DEFAULT '2592000' COMMENT 'Length in minutes of the event',
  `holiday` int unsigned NOT NULL DEFAULT '0' COMMENT 'Client side holiday id',
  `holidayStage` tinyint unsigned NOT NULL DEFAULT '0',
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Description of the event displayed in console',
  `world_event` tinyint unsigned NOT NULL DEFAULT '0' COMMENT '0 if normal event, 1 if world event',
  `announce` tinyint unsigned DEFAULT '2' COMMENT '0 dont announce, 1 announce, 2 value from config',
  PRIMARY KEY (`eventEntry`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.game_event_arena_seasons
CREATE TABLE IF NOT EXISTS `game_event_arena_seasons` (
  `eventEntry` tinyint unsigned NOT NULL COMMENT 'Entry of the game event',
  `season` tinyint unsigned NOT NULL COMMENT 'Arena season number',
  UNIQUE KEY `season` (`season`,`eventEntry`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.game_event_condition
CREATE TABLE IF NOT EXISTS `game_event_condition` (
  `eventEntry` tinyint unsigned NOT NULL COMMENT 'Entry of the game event',
  `condition_id` int unsigned NOT NULL DEFAULT '0',
  `req_num` float DEFAULT '0',
  `max_world_state_field` smallint unsigned NOT NULL DEFAULT '0',
  `done_world_state_field` smallint unsigned NOT NULL DEFAULT '0',
  `description` varchar(25) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`eventEntry`,`condition_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.game_event_creature
CREATE TABLE IF NOT EXISTS `game_event_creature` (
  `eventEntry` tinyint NOT NULL COMMENT 'Entry of the game event. Put negative entry to remove during event.',
  `guid` bigint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`guid`,`eventEntry`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.game_event_creature_quest
CREATE TABLE IF NOT EXISTS `game_event_creature_quest` (
  `eventEntry` tinyint unsigned NOT NULL COMMENT 'Entry of the game event.',
  `id` int unsigned NOT NULL DEFAULT '0',
  `quest` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`,`quest`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.game_event_gameobject
CREATE TABLE IF NOT EXISTS `game_event_gameobject` (
  `eventEntry` tinyint NOT NULL COMMENT 'Entry of the game event. Put negative entry to remove during event.',
  `guid` bigint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`guid`,`eventEntry`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.game_event_gameobject_quest
CREATE TABLE IF NOT EXISTS `game_event_gameobject_quest` (
  `eventEntry` tinyint unsigned NOT NULL COMMENT 'Entry of the game event',
  `id` int unsigned NOT NULL DEFAULT '0',
  `quest` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`,`quest`,`eventEntry`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.game_event_model_equip
CREATE TABLE IF NOT EXISTS `game_event_model_equip` (
  `eventEntry` tinyint NOT NULL COMMENT 'Entry of the game event.',
  `guid` bigint unsigned NOT NULL DEFAULT '0',
  `modelid` int unsigned NOT NULL DEFAULT '0',
  `equipment_id` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`guid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.game_event_npcflag
CREATE TABLE IF NOT EXISTS `game_event_npcflag` (
  `eventEntry` tinyint unsigned NOT NULL COMMENT 'Entry of the game event',
  `guid` bigint unsigned NOT NULL DEFAULT '0',
  `npcflag` bigint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`guid`,`eventEntry`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.game_event_npc_vendor
CREATE TABLE IF NOT EXISTS `game_event_npc_vendor` (
  `eventEntry` tinyint NOT NULL COMMENT 'Entry of the game event.',
  `guid` bigint unsigned NOT NULL DEFAULT '0',
  `slot` smallint NOT NULL DEFAULT '0',
  `item` int unsigned NOT NULL DEFAULT '0',
  `maxcount` int unsigned NOT NULL DEFAULT '0',
  `incrtime` int unsigned NOT NULL DEFAULT '0',
  `ExtendedCost` int unsigned NOT NULL DEFAULT '0',
  `type` tinyint unsigned NOT NULL DEFAULT '1',
  `BonusListIDs` mediumtext COLLATE utf8mb4_unicode_ci,
  `PlayerConditionID` int unsigned NOT NULL DEFAULT '0',
  `IgnoreFiltering` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`guid`,`item`,`ExtendedCost`,`type`),
  KEY `slot` (`slot`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.game_event_pool
CREATE TABLE IF NOT EXISTS `game_event_pool` (
  `eventEntry` tinyint NOT NULL COMMENT 'Entry of the game event. Put negative entry to remove during event.',
  `pool_entry` int unsigned NOT NULL DEFAULT '0' COMMENT 'Id of the pool',
  PRIMARY KEY (`pool_entry`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.game_event_prerequisite
CREATE TABLE IF NOT EXISTS `game_event_prerequisite` (
  `eventEntry` tinyint unsigned NOT NULL COMMENT 'Entry of the game event',
  `prerequisite_event` int unsigned NOT NULL,
  PRIMARY KEY (`eventEntry`,`prerequisite_event`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.game_event_quest_condition
CREATE TABLE IF NOT EXISTS `game_event_quest_condition` (
  `eventEntry` tinyint unsigned NOT NULL COMMENT 'Entry of the game event.',
  `quest` int unsigned NOT NULL DEFAULT '0',
  `condition_id` int unsigned NOT NULL DEFAULT '0',
  `num` float DEFAULT '0',
  PRIMARY KEY (`quest`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.game_event_seasonal_questrelation
CREATE TABLE IF NOT EXISTS `game_event_seasonal_questrelation` (
  `questId` int unsigned NOT NULL COMMENT 'Quest Identifier',
  `eventEntry` int unsigned NOT NULL DEFAULT '0' COMMENT 'Entry of the game event',
  PRIMARY KEY (`questId`,`eventEntry`),
  KEY `idx_quest` (`questId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Player System';

-- Data exporting was unselected.

-- Dumping structure for table world.game_tele
CREATE TABLE IF NOT EXISTS `game_tele` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `position_x` float NOT NULL DEFAULT '0',
  `position_y` float NOT NULL DEFAULT '0',
  `position_z` float NOT NULL DEFAULT '0',
  `orientation` float NOT NULL DEFAULT '0',
  `map` smallint unsigned NOT NULL DEFAULT '0',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1517 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tele Command';

-- Data exporting was unselected.

-- Dumping structure for table world.game_weather
CREATE TABLE IF NOT EXISTS `game_weather` (
  `zone` int unsigned NOT NULL DEFAULT '0',
  `spring_rain_chance` tinyint unsigned NOT NULL DEFAULT '25',
  `spring_snow_chance` tinyint unsigned NOT NULL DEFAULT '25',
  `spring_storm_chance` tinyint unsigned NOT NULL DEFAULT '25',
  `summer_rain_chance` tinyint unsigned NOT NULL DEFAULT '25',
  `summer_snow_chance` tinyint unsigned NOT NULL DEFAULT '25',
  `summer_storm_chance` tinyint unsigned NOT NULL DEFAULT '25',
  `fall_rain_chance` tinyint unsigned NOT NULL DEFAULT '25',
  `fall_snow_chance` tinyint unsigned NOT NULL DEFAULT '25',
  `fall_storm_chance` tinyint unsigned NOT NULL DEFAULT '25',
  `winter_rain_chance` tinyint unsigned NOT NULL DEFAULT '25',
  `winter_snow_chance` tinyint unsigned NOT NULL DEFAULT '25',
  `winter_storm_chance` tinyint unsigned NOT NULL DEFAULT '25',
  `ScriptName` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`zone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Weather System';

-- Data exporting was unselected.

-- Dumping structure for table world.gossip_menu
CREATE TABLE IF NOT EXISTS `gossip_menu` (
  `MenuID` int unsigned NOT NULL DEFAULT '0',
  `TextID` int unsigned NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`MenuID`,`TextID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.gossip_menu_addon
CREATE TABLE IF NOT EXISTS `gossip_menu_addon` (
  `MenuID` int unsigned NOT NULL DEFAULT '0',
  `FriendshipFactionID` int NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`MenuID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.gossip_menu_option
CREATE TABLE IF NOT EXISTS `gossip_menu_option` (
  `MenuID` int unsigned NOT NULL DEFAULT '0',
  `GossipOptionID` int NOT NULL DEFAULT '0',
  `OptionID` int unsigned NOT NULL DEFAULT '0',
  `OptionNpc` tinyint unsigned NOT NULL DEFAULT '0',
  `OptionText` mediumtext COLLATE utf8mb4_unicode_ci,
  `OptionBroadcastTextID` int unsigned NOT NULL DEFAULT '0',
  `OptionType` tinyint unsigned NOT NULL DEFAULT '0',
  `OptionNpcFlag` int unsigned NOT NULL DEFAULT '0',
  `Language` int unsigned NOT NULL DEFAULT '0',
  `Flags` int NOT NULL DEFAULT '0',
  `ActionMenuID` int unsigned NOT NULL DEFAULT '0',
  `ActionPoiID` int unsigned NOT NULL DEFAULT '0',
  `GossipNpcOptionID` int DEFAULT NULL,
  `BoxCoded` tinyint unsigned NOT NULL DEFAULT '0',
  `BoxMoney` int unsigned NOT NULL DEFAULT '0',
  `BoxText` mediumtext COLLATE utf8mb4_unicode_ci,
  `BoxBroadcastTextID` int unsigned NOT NULL DEFAULT '0',
  `SpellID` int DEFAULT NULL,
  `OverrideIconID` int DEFAULT NULL,
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`MenuID`,`OptionID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.gossip_menu_option_locale
CREATE TABLE IF NOT EXISTS `gossip_menu_option_locale` (
  `MenuID` int unsigned NOT NULL DEFAULT '0',
  `OptionID` int unsigned NOT NULL DEFAULT '0',
  `Locale` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `OptionText` mediumtext COLLATE utf8mb4_unicode_ci,
  `BoxText` mediumtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`MenuID`,`OptionID`,`Locale`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.graveyard_zone
CREATE TABLE IF NOT EXISTS `graveyard_zone` (
  `ID` int unsigned NOT NULL DEFAULT '0',
  `GhostZone` int unsigned NOT NULL DEFAULT '0',
  `Faction` int unsigned NOT NULL DEFAULT '0',
  `Comment` mediumtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`ID`,`GhostZone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Trigger System';

-- Data exporting was unselected.

-- Dumping structure for table world.guild_rewards
CREATE TABLE IF NOT EXISTS `guild_rewards` (
  `ItemID` int unsigned NOT NULL DEFAULT '0',
  `MinGuildRep` tinyint unsigned DEFAULT '0',
  `RaceMask` bigint unsigned DEFAULT '0',
  `Cost` bigint unsigned DEFAULT '0',
  PRIMARY KEY (`ItemID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.guild_rewards_req_achievements
CREATE TABLE IF NOT EXISTS `guild_rewards_req_achievements` (
  `ItemID` int unsigned NOT NULL DEFAULT '0',
  `AchievementRequired` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`ItemID`,`AchievementRequired`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.instance_spawn_groups
CREATE TABLE IF NOT EXISTS `instance_spawn_groups` (
  `instanceMapId` smallint unsigned NOT NULL,
  `bossStateId` tinyint unsigned NOT NULL,
  `bossStates` tinyint unsigned NOT NULL,
  `spawnGroupId` int unsigned NOT NULL,
  `flags` tinyint unsigned NOT NULL,
  PRIMARY KEY (`instanceMapId`,`bossStateId`,`spawnGroupId`,`bossStates`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.instance_template
CREATE TABLE IF NOT EXISTS `instance_template` (
  `map` smallint unsigned NOT NULL,
  `parent` smallint unsigned NOT NULL,
  `script` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `allowMount` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`map`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.item_loot_template
CREATE TABLE IF NOT EXISTS `item_loot_template` (
  `Entry` int unsigned NOT NULL DEFAULT '0',
  `Item` int unsigned NOT NULL DEFAULT '0',
  `Reference` int unsigned NOT NULL DEFAULT '0',
  `Chance` float NOT NULL DEFAULT '100',
  `QuestRequired` tinyint(1) NOT NULL DEFAULT '0',
  `LootMode` smallint unsigned NOT NULL DEFAULT '1',
  `GroupId` tinyint unsigned NOT NULL DEFAULT '0',
  `MinCount` tinyint unsigned NOT NULL DEFAULT '1',
  `MaxCount` tinyint unsigned NOT NULL DEFAULT '1',
  `Comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`Entry`,`Item`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Loot System';

-- Data exporting was unselected.

-- Dumping structure for table world.item_random_bonus_list_template
CREATE TABLE IF NOT EXISTS `item_random_bonus_list_template` (
  `Id` int unsigned NOT NULL,
  `BonusListID` int unsigned NOT NULL,
  `Chance` float NOT NULL,
  PRIMARY KEY (`Id`,`BonusListID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Item Random Enchantment System';

-- Data exporting was unselected.

-- Dumping structure for table world.item_random_enchantment_template
CREATE TABLE IF NOT EXISTS `item_random_enchantment_template` (
  `Id` int unsigned NOT NULL DEFAULT '0',
  `EnchantmentId` int unsigned NOT NULL DEFAULT '0',
  `Chance` float unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`Id`,`EnchantmentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Item Random Enchantment System';

-- Data exporting was unselected.

-- Dumping structure for table world.item_script_names
CREATE TABLE IF NOT EXISTS `item_script_names` (
  `Id` int unsigned NOT NULL,
  `ScriptName` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.item_template_addon
CREATE TABLE IF NOT EXISTS `item_template_addon` (
  `Id` int unsigned NOT NULL,
  `FlagsCu` int unsigned NOT NULL DEFAULT '0',
  `FoodType` tinyint unsigned NOT NULL DEFAULT '0',
  `MinMoneyLoot` int unsigned NOT NULL DEFAULT '0',
  `MaxMoneyLoot` int unsigned NOT NULL DEFAULT '0',
  `SpellPPMChance` float NOT NULL DEFAULT '0',
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.jump_charge_params
CREATE TABLE IF NOT EXISTS `jump_charge_params` (
  `id` int NOT NULL,
  `speed` float NOT NULL DEFAULT '42',
  `treatSpeedAsMoveTimeSeconds` tinyint(1) NOT NULL DEFAULT '0',
  `jumpGravity` float NOT NULL DEFAULT '19.2911',
  `spellVisualId` int DEFAULT NULL,
  `progressCurveId` int DEFAULT NULL,
  `parabolicCurveId` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.lfg_dungeon_rewards
CREATE TABLE IF NOT EXISTS `lfg_dungeon_rewards` (
  `dungeonId` int unsigned NOT NULL DEFAULT '0' COMMENT 'Dungeon entry from dbc',
  `maxLevel` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'Max level at which this reward is rewarded',
  `firstQuestId` int unsigned NOT NULL DEFAULT '0' COMMENT 'Quest id with rewards for first dungeon this day',
  `otherQuestId` int unsigned NOT NULL DEFAULT '0' COMMENT 'Quest id with rewards for Nth dungeon this day',
  PRIMARY KEY (`dungeonId`,`maxLevel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.lfg_dungeon_template
CREATE TABLE IF NOT EXISTS `lfg_dungeon_template` (
  `dungeonId` int unsigned NOT NULL DEFAULT '0' COMMENT 'Unique id from LFGDungeons.dbc',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `position_x` float NOT NULL DEFAULT '0',
  `position_y` float NOT NULL DEFAULT '0',
  `position_z` float NOT NULL DEFAULT '0',
  `orientation` float NOT NULL DEFAULT '0',
  `requiredItemLevel` smallint NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`dungeonId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.linked_respawn
CREATE TABLE IF NOT EXISTS `linked_respawn` (
  `guid` bigint unsigned NOT NULL DEFAULT '0',
  `linkedGuid` bigint unsigned NOT NULL DEFAULT '0',
  `linkType` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`guid`,`linkType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Creature Respawn Link System';

-- Data exporting was unselected.

-- Dumping structure for table world.mail_level_reward
CREATE TABLE IF NOT EXISTS `mail_level_reward` (
  `level` tinyint unsigned NOT NULL DEFAULT '0',
  `raceMask` bigint unsigned NOT NULL,
  `mailTemplateId` int unsigned NOT NULL DEFAULT '0',
  `senderEntry` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`level`,`raceMask`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Mail System';

-- Data exporting was unselected.

-- Dumping structure for table world.mail_loot_template
CREATE TABLE IF NOT EXISTS `mail_loot_template` (
  `Entry` int unsigned NOT NULL DEFAULT '0',
  `Item` int unsigned NOT NULL DEFAULT '0',
  `Reference` int unsigned NOT NULL DEFAULT '0',
  `Chance` float NOT NULL DEFAULT '100',
  `QuestRequired` tinyint(1) NOT NULL DEFAULT '0',
  `LootMode` smallint unsigned NOT NULL DEFAULT '1',
  `GroupId` tinyint unsigned NOT NULL DEFAULT '0',
  `MinCount` tinyint unsigned NOT NULL DEFAULT '1',
  `MaxCount` tinyint unsigned NOT NULL DEFAULT '1',
  `Comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`Entry`,`Item`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Loot System';

-- Data exporting was unselected.

-- Dumping structure for table world.map_corpse_position
CREATE TABLE IF NOT EXISTS `map_corpse_position` (
  `MapId` int unsigned NOT NULL DEFAULT '0',
  `CorpseX` float NOT NULL DEFAULT '0',
  `CorpseY` float NOT NULL DEFAULT '0',
  PRIMARY KEY (`MapId`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.milling_loot_template
CREATE TABLE IF NOT EXISTS `milling_loot_template` (
  `Entry` int unsigned NOT NULL DEFAULT '0',
  `Item` int unsigned NOT NULL DEFAULT '0',
  `Reference` int unsigned NOT NULL DEFAULT '0',
  `Chance` float NOT NULL DEFAULT '100',
  `QuestRequired` tinyint(1) NOT NULL DEFAULT '0',
  `LootMode` smallint unsigned NOT NULL DEFAULT '1',
  `GroupId` tinyint unsigned NOT NULL DEFAULT '0',
  `MinCount` tinyint unsigned NOT NULL DEFAULT '1',
  `MaxCount` tinyint unsigned NOT NULL DEFAULT '1',
  `Comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`Entry`,`Item`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Loot System';

-- Data exporting was unselected.

-- Dumping structure for table world.mount_definitions
CREATE TABLE IF NOT EXISTS `mount_definitions` (
  `spellId` int unsigned NOT NULL,
  `otherFactionSpellId` int unsigned NOT NULL,
  PRIMARY KEY (`spellId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.npc_spellclick_spells
CREATE TABLE IF NOT EXISTS `npc_spellclick_spells` (
  `npc_entry` int unsigned NOT NULL COMMENT 'reference to creature_template',
  `spell_id` int unsigned NOT NULL COMMENT 'spell which should be casted ',
  `cast_flags` tinyint unsigned NOT NULL COMMENT 'first bit defines caster: 1=player, 0=creature; second bit defines target, same mapping as caster bit',
  `user_type` smallint unsigned NOT NULL DEFAULT '0' COMMENT 'relation with summoner: 0-no 1-friendly 2-raid 3-party player can click',
  PRIMARY KEY (`npc_entry`,`spell_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.npc_text
CREATE TABLE IF NOT EXISTS `npc_text` (
  `ID` int unsigned NOT NULL DEFAULT '0',
  `Probability0` float NOT NULL DEFAULT '0',
  `Probability1` float NOT NULL DEFAULT '0',
  `Probability2` float NOT NULL DEFAULT '0',
  `Probability3` float NOT NULL DEFAULT '0',
  `Probability4` float NOT NULL DEFAULT '0',
  `Probability5` float NOT NULL DEFAULT '0',
  `Probability6` float NOT NULL DEFAULT '0',
  `Probability7` float NOT NULL DEFAULT '0',
  `BroadcastTextID0` int unsigned NOT NULL DEFAULT '0',
  `BroadcastTextID1` int unsigned NOT NULL DEFAULT '0',
  `BroadcastTextID2` int unsigned NOT NULL DEFAULT '0',
  `BroadcastTextID3` int unsigned NOT NULL DEFAULT '0',
  `BroadcastTextID4` int unsigned NOT NULL DEFAULT '0',
  `BroadcastTextID5` int unsigned NOT NULL DEFAULT '0',
  `BroadcastTextID6` int unsigned NOT NULL DEFAULT '0',
  `BroadcastTextID7` int unsigned NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.npc_vendor
CREATE TABLE IF NOT EXISTS `npc_vendor` (
  `entry` int unsigned NOT NULL DEFAULT '0',
  `slot` smallint NOT NULL DEFAULT '0',
  `item` int NOT NULL DEFAULT '0',
  `maxcount` int unsigned NOT NULL DEFAULT '0',
  `incrtime` int unsigned NOT NULL DEFAULT '0',
  `ExtendedCost` int unsigned NOT NULL DEFAULT '0',
  `type` tinyint unsigned NOT NULL DEFAULT '1',
  `BonusListIDs` mediumtext COLLATE utf8mb4_unicode_ci,
  `PlayerConditionID` int unsigned NOT NULL DEFAULT '0',
  `IgnoreFiltering` tinyint unsigned NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`entry`,`item`,`ExtendedCost`,`type`),
  KEY `slot` (`slot`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Npc System';

-- Data exporting was unselected.

-- Dumping structure for table world.outdoorpvp_template
CREATE TABLE IF NOT EXISTS `outdoorpvp_template` (
  `TypeId` tinyint unsigned NOT NULL,
  `ScriptName` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `comment` mediumtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`TypeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OutdoorPvP Templates';

-- Data exporting was unselected.

-- Dumping structure for table world.page_text
CREATE TABLE IF NOT EXISTS `page_text` (
  `ID` int unsigned NOT NULL DEFAULT '0',
  `Text` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `NextPageID` int unsigned NOT NULL DEFAULT '0',
  `PlayerConditionID` int NOT NULL DEFAULT '0',
  `Flags` tinyint unsigned NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Item System';

-- Data exporting was unselected.

-- Dumping structure for table world.page_text_locale
CREATE TABLE IF NOT EXISTS `page_text_locale` (
  `ID` int unsigned NOT NULL DEFAULT '0',
  `locale` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Text` mediumtext COLLATE utf8mb4_unicode_ci,
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ID`,`locale`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.pet_levelstats
CREATE TABLE IF NOT EXISTS `pet_levelstats` (
  `creature_entry` int unsigned NOT NULL,
  `level` tinyint unsigned NOT NULL,
  `hp` smallint unsigned NOT NULL,
  `mana` smallint unsigned NOT NULL,
  `armor` int unsigned NOT NULL DEFAULT '0',
  `str` smallint unsigned NOT NULL,
  `agi` smallint unsigned NOT NULL,
  `sta` smallint unsigned NOT NULL,
  `inte` smallint unsigned NOT NULL,
  `spi` smallint unsigned NOT NULL,
  `min_dmg` smallint unsigned NOT NULL DEFAULT '0',
  `max_dmg` smallint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`creature_entry`,`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci PACK_KEYS=0 COMMENT='Stores pet levels stats.';

-- Data exporting was unselected.

-- Dumping structure for table world.pet_name_generation
CREATE TABLE IF NOT EXISTS `pet_name_generation` (
  `id` int unsigned NOT NULL,
  `word` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `entry` int unsigned NOT NULL DEFAULT '0',
  `half` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.phase_area
CREATE TABLE IF NOT EXISTS `phase_area` (
  `AreaId` int unsigned NOT NULL,
  `PhaseId` int unsigned NOT NULL,
  `Comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`AreaId`,`PhaseId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.phase_name
CREATE TABLE IF NOT EXISTS `phase_name` (
  `ID` int unsigned NOT NULL,
  `Name` mediumtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Helper table to store names for phases';

-- Data exporting was unselected.

-- Dumping structure for table world.pickpocketing_loot_template
CREATE TABLE IF NOT EXISTS `pickpocketing_loot_template` (
  `Entry` int unsigned NOT NULL DEFAULT '0',
  `Item` int unsigned NOT NULL DEFAULT '0',
  `Reference` int unsigned NOT NULL DEFAULT '0',
  `Chance` float NOT NULL DEFAULT '100',
  `QuestRequired` tinyint(1) NOT NULL DEFAULT '0',
  `LootMode` smallint unsigned NOT NULL DEFAULT '1',
  `GroupId` tinyint unsigned NOT NULL DEFAULT '0',
  `MinCount` tinyint unsigned NOT NULL DEFAULT '1',
  `MaxCount` tinyint unsigned NOT NULL DEFAULT '1',
  `Comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`Entry`,`Item`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Loot System';

-- Data exporting was unselected.

-- Dumping structure for table world.playerchoice
CREATE TABLE IF NOT EXISTS `playerchoice` (
  `ChoiceId` int NOT NULL,
  `UiTextureKitId` int NOT NULL DEFAULT '0',
  `SoundKitId` int unsigned NOT NULL DEFAULT '0',
  `CloseSoundKitId` int unsigned NOT NULL DEFAULT '0',
  `Duration` bigint NOT NULL DEFAULT '0',
  `PendingChoiceText` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `Question` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `HideWarboardHeader` tinyint(1) NOT NULL DEFAULT '0',
  `KeepOpenAfterChoice` tinyint unsigned NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ChoiceId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.playerchoice_locale
CREATE TABLE IF NOT EXISTS `playerchoice_locale` (
  `ChoiceId` int NOT NULL,
  `locale` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Question` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ChoiceId`,`locale`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.playerchoice_response
CREATE TABLE IF NOT EXISTS `playerchoice_response` (
  `ChoiceId` int NOT NULL,
  `ResponseId` int NOT NULL,
  `ResponseIdentifier` smallint unsigned NOT NULL,
  `Index` int unsigned NOT NULL,
  `ChoiceArtFileId` int NOT NULL DEFAULT '0',
  `Flags` int NOT NULL DEFAULT '0',
  `WidgetSetID` int unsigned NOT NULL DEFAULT '0',
  `UiTextureAtlasElementID` int unsigned NOT NULL DEFAULT '0',
  `SoundKitID` int unsigned NOT NULL DEFAULT '0',
  `GroupID` tinyint unsigned NOT NULL DEFAULT '0',
  `UiTextureKitID` int NOT NULL DEFAULT '0',
  `Header` varchar(511) COLLATE utf8mb4_unicode_ci NOT NULL,
  `SubHeader` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `ButtonTooltip` varchar(400) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `Answer` varchar(511) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Description` varchar(2047) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Confirmation` varchar(127) COLLATE utf8mb4_unicode_ci NOT NULL,
  `RewardQuestID` int unsigned DEFAULT NULL,
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ChoiceId`,`ResponseId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.playerchoice_response_locale
CREATE TABLE IF NOT EXISTS `playerchoice_response_locale` (
  `ChoiceId` int NOT NULL,
  `ResponseId` int NOT NULL,
  `locale` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Header` varchar(511) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `SubHeader` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `ButtonTooltip` varchar(400) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `Answer` varchar(511) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `Description` varchar(2047) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `Confirmation` varchar(127) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ChoiceId`,`ResponseId`,`locale`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.playerchoice_response_maw_power
CREATE TABLE IF NOT EXISTS `playerchoice_response_maw_power` (
  `ChoiceId` int NOT NULL,
  `ResponseId` int NOT NULL,
  `TypeArtFileID` int DEFAULT '0',
  `Rarity` int DEFAULT '0',
  `RarityColor` int unsigned DEFAULT '0',
  `SpellID` int DEFAULT '0',
  `MaxStacks` int DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ChoiceId`,`ResponseId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.playerchoice_response_reward
CREATE TABLE IF NOT EXISTS `playerchoice_response_reward` (
  `ChoiceId` int NOT NULL,
  `ResponseId` int NOT NULL,
  `TitleId` int NOT NULL DEFAULT '0',
  `PackageId` int NOT NULL DEFAULT '0',
  `SkillLineId` int unsigned NOT NULL DEFAULT '0',
  `SkillPointCount` int unsigned NOT NULL DEFAULT '0',
  `ArenaPointCount` int unsigned NOT NULL DEFAULT '0',
  `HonorPointCount` int unsigned NOT NULL DEFAULT '0',
  `Money` bigint unsigned NOT NULL DEFAULT '0',
  `Xp` int unsigned NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ChoiceId`,`ResponseId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.playerchoice_response_reward_currency
CREATE TABLE IF NOT EXISTS `playerchoice_response_reward_currency` (
  `ChoiceId` int NOT NULL,
  `ResponseId` int NOT NULL,
  `Index` int unsigned NOT NULL,
  `CurrencyId` int unsigned NOT NULL DEFAULT '0',
  `Quantity` int NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ChoiceId`,`ResponseId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.playerchoice_response_reward_faction
CREATE TABLE IF NOT EXISTS `playerchoice_response_reward_faction` (
  `ChoiceId` int NOT NULL,
  `ResponseId` int NOT NULL,
  `Index` int unsigned NOT NULL,
  `FactionId` int unsigned NOT NULL DEFAULT '0',
  `Quantity` int NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ChoiceId`,`ResponseId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.playerchoice_response_reward_item
CREATE TABLE IF NOT EXISTS `playerchoice_response_reward_item` (
  `ChoiceId` int NOT NULL,
  `ResponseId` int NOT NULL,
  `Index` int unsigned NOT NULL,
  `ItemId` int unsigned NOT NULL DEFAULT '0',
  `BonusListIDs` mediumtext COLLATE utf8mb4_unicode_ci,
  `Quantity` int NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ChoiceId`,`ResponseId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.playerchoice_response_reward_item_choice
CREATE TABLE IF NOT EXISTS `playerchoice_response_reward_item_choice` (
  `ChoiceId` int NOT NULL,
  `ResponseId` int NOT NULL,
  `Index` int unsigned NOT NULL,
  `ItemId` int unsigned NOT NULL DEFAULT '0',
  `BonusListIDs` mediumtext COLLATE utf8mb4_unicode_ci,
  `Quantity` int NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ChoiceId`,`ResponseId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.playercreateinfo
CREATE TABLE IF NOT EXISTS `playercreateinfo` (
  `race` tinyint unsigned NOT NULL DEFAULT '0',
  `class` tinyint unsigned NOT NULL DEFAULT '0',
  `map` smallint unsigned NOT NULL DEFAULT '0',
  `position_x` float NOT NULL DEFAULT '0',
  `position_y` float NOT NULL DEFAULT '0',
  `position_z` float NOT NULL DEFAULT '0',
  `orientation` float NOT NULL DEFAULT '0',
  `npe_map` int unsigned DEFAULT NULL,
  `npe_position_x` float DEFAULT NULL,
  `npe_position_y` float DEFAULT NULL,
  `npe_position_z` float DEFAULT NULL,
  `npe_orientation` float DEFAULT NULL,
  `npe_transport_guid` bigint unsigned DEFAULT NULL,
  `intro_movie_id` int unsigned DEFAULT NULL,
  `intro_scene_id` int unsigned DEFAULT NULL,
  `npe_intro_scene_id` int unsigned DEFAULT NULL,
  PRIMARY KEY (`race`,`class`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.playercreateinfo_action
CREATE TABLE IF NOT EXISTS `playercreateinfo_action` (
  `race` tinyint unsigned NOT NULL DEFAULT '0',
  `class` tinyint unsigned NOT NULL DEFAULT '0',
  `button` smallint unsigned NOT NULL DEFAULT '0',
  `action` int unsigned NOT NULL DEFAULT '0',
  `type` smallint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`race`,`class`,`button`),
  KEY `playercreateinfo_race_class_index` (`race`,`class`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.playercreateinfo_cast_spell
CREATE TABLE IF NOT EXISTS `playercreateinfo_cast_spell` (
  `raceMask` bigint unsigned NOT NULL,
  `classMask` int unsigned NOT NULL DEFAULT '0',
  `createMode` tinyint NOT NULL DEFAULT '0',
  `spell` int unsigned NOT NULL DEFAULT '0',
  `note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`raceMask`,`classMask`,`createMode`,`spell`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.playercreateinfo_item
CREATE TABLE IF NOT EXISTS `playercreateinfo_item` (
  `race` tinyint unsigned NOT NULL DEFAULT '0',
  `class` tinyint unsigned NOT NULL DEFAULT '0',
  `itemid` int unsigned NOT NULL DEFAULT '0',
  `amount` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`race`,`class`,`itemid`),
  KEY `playercreateinfo_race_class_index` (`race`,`class`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.playercreateinfo_skills
CREATE TABLE IF NOT EXISTS `playercreateinfo_skills` (
  `raceMask` int unsigned NOT NULL,
  `classMask` int unsigned NOT NULL,
  `skill` smallint unsigned NOT NULL,
  `rank` smallint unsigned NOT NULL DEFAULT '0',
  `comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`raceMask`,`classMask`,`skill`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.playercreateinfo_spell_custom
CREATE TABLE IF NOT EXISTS `playercreateinfo_spell_custom` (
  `racemask` int unsigned NOT NULL DEFAULT '0',
  `classmask` int unsigned NOT NULL DEFAULT '0',
  `Spell` int unsigned NOT NULL DEFAULT '0',
  `Note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`racemask`,`classmask`,`Spell`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.player_classlevelstats
CREATE TABLE IF NOT EXISTS `player_classlevelstats` (
  `class` tinyint unsigned NOT NULL,
  `level` tinyint unsigned NOT NULL,
  `basehp` smallint unsigned NOT NULL,
  `basemana` smallint unsigned NOT NULL,
  PRIMARY KEY (`class`,`level`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci PACK_KEYS=0 COMMENT='Stores levels stats.';

-- Data exporting was unselected.

-- Dumping structure for table world.player_factionchange_achievement
CREATE TABLE IF NOT EXISTS `player_factionchange_achievement` (
  `alliance_id` int unsigned NOT NULL,
  `horde_id` int unsigned NOT NULL,
  PRIMARY KEY (`alliance_id`,`horde_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.player_factionchange_quests
CREATE TABLE IF NOT EXISTS `player_factionchange_quests` (
  `alliance_id` int unsigned NOT NULL,
  `horde_id` int unsigned NOT NULL,
  PRIMARY KEY (`alliance_id`,`horde_id`),
  UNIQUE KEY `alliance_uniq` (`alliance_id`),
  UNIQUE KEY `horde_uniq` (`horde_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.player_factionchange_reputations
CREATE TABLE IF NOT EXISTS `player_factionchange_reputations` (
  `alliance_id` int unsigned NOT NULL,
  `horde_id` int unsigned NOT NULL,
  PRIMARY KEY (`alliance_id`,`horde_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.player_factionchange_spells
CREATE TABLE IF NOT EXISTS `player_factionchange_spells` (
  `alliance_id` int unsigned NOT NULL,
  `horde_id` int unsigned NOT NULL,
  PRIMARY KEY (`alliance_id`,`horde_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.player_factionchange_titles
CREATE TABLE IF NOT EXISTS `player_factionchange_titles` (
  `alliance_id` int NOT NULL,
  `horde_id` int NOT NULL,
  PRIMARY KEY (`alliance_id`,`horde_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.player_levelstats
CREATE TABLE IF NOT EXISTS `player_levelstats` (
  `race` tinyint unsigned NOT NULL,
  `class` tinyint unsigned NOT NULL,
  `level` tinyint unsigned NOT NULL,
  `str` tinyint unsigned NOT NULL,
  `agi` tinyint unsigned NOT NULL,
  `sta` tinyint unsigned NOT NULL,
  `inte` tinyint unsigned NOT NULL,
  `spi` tinyint unsigned NOT NULL,
  PRIMARY KEY (`race`,`class`,`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci PACK_KEYS=0 COMMENT='Stores levels stats.';

-- Data exporting was unselected.

-- Dumping structure for table world.player_totem_model
CREATE TABLE IF NOT EXISTS `player_totem_model` (
  `TotemSlot` tinyint unsigned NOT NULL,
  `RaceId` tinyint unsigned NOT NULL,
  `DisplayId` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`TotemSlot`,`RaceId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.player_xp_for_level
CREATE TABLE IF NOT EXISTS `player_xp_for_level` (
  `Level` tinyint unsigned NOT NULL,
  `Experience` int unsigned NOT NULL,
  PRIMARY KEY (`Level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.points_of_interest
CREATE TABLE IF NOT EXISTS `points_of_interest` (
  `ID` int unsigned NOT NULL DEFAULT '0',
  `PositionX` float NOT NULL DEFAULT '0',
  `PositionY` float NOT NULL DEFAULT '0',
  `PositionZ` float NOT NULL DEFAULT '0',
  `Icon` int unsigned NOT NULL DEFAULT '0',
  `Flags` int unsigned NOT NULL DEFAULT '0',
  `Importance` int unsigned NOT NULL DEFAULT '0',
  `Name` mediumtext COLLATE utf8mb4_unicode_ci,
  `WMOGroupID` int NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.points_of_interest_locale
CREATE TABLE IF NOT EXISTS `points_of_interest_locale` (
  `ID` int unsigned NOT NULL DEFAULT '0',
  `locale` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Name` mediumtext COLLATE utf8mb4_unicode_ci,
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ID`,`locale`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.pool_members
CREATE TABLE IF NOT EXISTS `pool_members` (
  `type` smallint unsigned NOT NULL,
  `spawnId` bigint unsigned NOT NULL,
  `poolSpawnId` int unsigned NOT NULL,
  `chance` float NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`type`,`spawnId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.pool_template
CREATE TABLE IF NOT EXISTS `pool_template` (
  `entry` int unsigned NOT NULL DEFAULT '0' COMMENT 'Pool entry',
  `max_limit` int unsigned NOT NULL DEFAULT '0' COMMENT 'Max number of objects (0) is no limit',
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`entry`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.prospecting_loot_template
CREATE TABLE IF NOT EXISTS `prospecting_loot_template` (
  `Entry` int unsigned NOT NULL DEFAULT '0',
  `Item` int unsigned NOT NULL DEFAULT '0',
  `Reference` int unsigned NOT NULL DEFAULT '0',
  `Chance` float NOT NULL DEFAULT '100',
  `QuestRequired` tinyint(1) NOT NULL DEFAULT '0',
  `LootMode` smallint unsigned NOT NULL DEFAULT '1',
  `GroupId` tinyint unsigned NOT NULL DEFAULT '0',
  `MinCount` tinyint unsigned NOT NULL DEFAULT '1',
  `MaxCount` tinyint unsigned NOT NULL DEFAULT '1',
  `Comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`Entry`,`Item`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Loot System';

-- Data exporting was unselected.

-- Dumping structure for table world.quest_completion_log_conditional
CREATE TABLE IF NOT EXISTS `quest_completion_log_conditional` (
  `QuestId` int NOT NULL,
  `PlayerConditionId` int NOT NULL,
  `QuestgiverCreatureId` int NOT NULL,
  `locale` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Text` text COLLATE utf8mb4_unicode_ci,
  `OrderIndex` int NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`QuestId`,`PlayerConditionId`,`QuestgiverCreatureId`,`locale`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.quest_description_conditional
CREATE TABLE IF NOT EXISTS `quest_description_conditional` (
  `QuestId` int NOT NULL,
  `PlayerConditionId` int NOT NULL,
  `QuestgiverCreatureId` int NOT NULL,
  `locale` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Text` text COLLATE utf8mb4_unicode_ci,
  `OrderIndex` int NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`QuestId`,`PlayerConditionId`,`QuestgiverCreatureId`,`locale`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.quest_details
CREATE TABLE IF NOT EXISTS `quest_details` (
  `ID` int unsigned NOT NULL DEFAULT '0',
  `Emote1` smallint unsigned NOT NULL DEFAULT '0',
  `Emote2` smallint unsigned NOT NULL DEFAULT '0',
  `Emote3` smallint unsigned NOT NULL DEFAULT '0',
  `Emote4` smallint unsigned NOT NULL DEFAULT '0',
  `EmoteDelay1` int unsigned NOT NULL DEFAULT '0',
  `EmoteDelay2` int unsigned NOT NULL DEFAULT '0',
  `EmoteDelay3` int unsigned NOT NULL DEFAULT '0',
  `EmoteDelay4` int unsigned NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.quest_greeting
CREATE TABLE IF NOT EXISTS `quest_greeting` (
  `ID` int unsigned NOT NULL DEFAULT '0',
  `Type` tinyint unsigned NOT NULL DEFAULT '0',
  `GreetEmoteType` smallint unsigned NOT NULL DEFAULT '0',
  `GreetEmoteDelay` int unsigned NOT NULL DEFAULT '0',
  `Greeting` mediumtext COLLATE utf8mb4_unicode_ci,
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ID`,`Type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.quest_greeting_locale
CREATE TABLE IF NOT EXISTS `quest_greeting_locale` (
  `ID` int unsigned NOT NULL DEFAULT '0',
  `type` tinyint unsigned NOT NULL DEFAULT '0',
  `locale` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Greeting` mediumtext COLLATE utf8mb4_unicode_ci,
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ID`,`type`,`locale`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.quest_mail_sender
CREATE TABLE IF NOT EXISTS `quest_mail_sender` (
  `QuestId` int unsigned NOT NULL DEFAULT '0',
  `RewardMailSenderEntry` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`QuestId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.quest_objectives
CREATE TABLE IF NOT EXISTS `quest_objectives` (
  `ID` int unsigned NOT NULL DEFAULT '0',
  `QuestID` int unsigned NOT NULL DEFAULT '0',
  `Type` tinyint unsigned NOT NULL DEFAULT '0',
  `Order` tinyint unsigned NOT NULL DEFAULT '0',
  `StorageIndex` tinyint NOT NULL DEFAULT '0',
  `ObjectID` int NOT NULL DEFAULT '0',
  `Amount` int NOT NULL DEFAULT '0',
  `Flags` int unsigned NOT NULL DEFAULT '0',
  `Flags2` int unsigned NOT NULL DEFAULT '0',
  `ProgressBarWeight` float NOT NULL DEFAULT '0',
  `Description` mediumtext COLLATE utf8mb4_unicode_ci,
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.quest_objectives_completion_effect
CREATE TABLE IF NOT EXISTS `quest_objectives_completion_effect` (
  `ObjectiveID` int NOT NULL,
  `GameEventID` int DEFAULT NULL,
  `SpellID` int DEFAULT NULL,
  `ConversationID` int DEFAULT NULL,
  `UpdatePhaseShift` tinyint(1) DEFAULT '0',
  `UpdateZoneAuras` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`ObjectiveID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.quest_objectives_locale
CREATE TABLE IF NOT EXISTS `quest_objectives_locale` (
  `ID` int unsigned NOT NULL DEFAULT '0',
  `locale` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `QuestId` int unsigned NOT NULL DEFAULT '0',
  `StorageIndex` tinyint NOT NULL DEFAULT '0',
  `Description` mediumtext COLLATE utf8mb4_unicode_ci,
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ID`,`locale`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.quest_offer_reward
CREATE TABLE IF NOT EXISTS `quest_offer_reward` (
  `ID` int unsigned NOT NULL DEFAULT '0',
  `Emote1` smallint NOT NULL DEFAULT '0',
  `Emote2` smallint NOT NULL DEFAULT '0',
  `Emote3` smallint NOT NULL DEFAULT '0',
  `Emote4` smallint NOT NULL DEFAULT '0',
  `EmoteDelay1` int unsigned NOT NULL DEFAULT '0',
  `EmoteDelay2` int unsigned NOT NULL DEFAULT '0',
  `EmoteDelay3` int unsigned NOT NULL DEFAULT '0',
  `EmoteDelay4` int unsigned NOT NULL DEFAULT '0',
  `RewardText` mediumtext COLLATE utf8mb4_unicode_ci,
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.quest_offer_reward_conditional
CREATE TABLE IF NOT EXISTS `quest_offer_reward_conditional` (
  `QuestId` int NOT NULL,
  `PlayerConditionId` int NOT NULL,
  `QuestgiverCreatureId` int NOT NULL,
  `locale` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Text` text COLLATE utf8mb4_unicode_ci,
  `OrderIndex` int NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`QuestId`,`PlayerConditionId`,`QuestgiverCreatureId`,`locale`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.quest_offer_reward_locale
CREATE TABLE IF NOT EXISTS `quest_offer_reward_locale` (
  `ID` int unsigned NOT NULL DEFAULT '0',
  `locale` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `RewardText` mediumtext COLLATE utf8mb4_unicode_ci,
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ID`,`locale`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.quest_poi
CREATE TABLE IF NOT EXISTS `quest_poi` (
  `QuestID` int NOT NULL DEFAULT '0',
  `BlobIndex` int NOT NULL DEFAULT '0',
  `Idx1` int NOT NULL DEFAULT '0',
  `ObjectiveIndex` int NOT NULL DEFAULT '0',
  `QuestObjectiveID` int NOT NULL DEFAULT '0',
  `QuestObjectID` int NOT NULL DEFAULT '0',
  `MapID` int NOT NULL DEFAULT '0',
  `UiMapID` int NOT NULL DEFAULT '0',
  `Priority` int NOT NULL DEFAULT '0',
  `Flags` int NOT NULL DEFAULT '0',
  `WorldEffectID` int NOT NULL DEFAULT '0',
  `PlayerConditionID` int NOT NULL DEFAULT '0',
  `NavigationPlayerConditionID` int NOT NULL DEFAULT '0',
  `SpawnTrackingID` int NOT NULL DEFAULT '0',
  `AlwaysAllowMergingBlobs` tinyint unsigned NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`QuestID`,`BlobIndex`,`Idx1`),
  KEY `idx` (`QuestID`,`BlobIndex`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.quest_poi_points
CREATE TABLE IF NOT EXISTS `quest_poi_points` (
  `QuestID` int NOT NULL DEFAULT '0',
  `Idx1` int NOT NULL DEFAULT '0',
  `Idx2` int NOT NULL DEFAULT '0',
  `X` int NOT NULL DEFAULT '0',
  `Y` int NOT NULL DEFAULT '0',
  `Z` int NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`QuestID`,`Idx1`,`Idx2`),
  KEY `questId_id` (`QuestID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.quest_pool_members
CREATE TABLE IF NOT EXISTS `quest_pool_members` (
  `questId` int unsigned NOT NULL,
  `poolId` int unsigned NOT NULL,
  `poolIndex` tinyint unsigned NOT NULL COMMENT 'Multiple quests with the same index will always spawn together!',
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`questId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.quest_pool_template
CREATE TABLE IF NOT EXISTS `quest_pool_template` (
  `poolId` int unsigned NOT NULL,
  `numActive` int unsigned NOT NULL COMMENT 'Number of indices to have active at any time',
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`poolId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.quest_request_items
CREATE TABLE IF NOT EXISTS `quest_request_items` (
  `ID` int unsigned NOT NULL DEFAULT '0',
  `EmoteOnComplete` smallint unsigned NOT NULL DEFAULT '0',
  `EmoteOnIncomplete` smallint unsigned NOT NULL DEFAULT '0',
  `EmoteOnCompleteDelay` int unsigned NOT NULL DEFAULT '0',
  `EmoteOnIncompleteDelay` int unsigned NOT NULL DEFAULT '0',
  `CompletionText` mediumtext COLLATE utf8mb4_unicode_ci,
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.quest_request_items_conditional
CREATE TABLE IF NOT EXISTS `quest_request_items_conditional` (
  `QuestId` int NOT NULL,
  `PlayerConditionId` int NOT NULL,
  `QuestgiverCreatureId` int NOT NULL,
  `locale` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Text` text COLLATE utf8mb4_unicode_ci,
  `OrderIndex` int NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`QuestId`,`PlayerConditionId`,`QuestgiverCreatureId`,`locale`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.quest_request_items_locale
CREATE TABLE IF NOT EXISTS `quest_request_items_locale` (
  `ID` int unsigned NOT NULL DEFAULT '0',
  `locale` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `CompletionText` mediumtext COLLATE utf8mb4_unicode_ci,
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ID`,`locale`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.quest_reward_choice_items
CREATE TABLE IF NOT EXISTS `quest_reward_choice_items` (
  `QuestID` int unsigned NOT NULL,
  `Type1` tinyint unsigned DEFAULT '0',
  `Type2` tinyint unsigned DEFAULT '0',
  `Type3` tinyint unsigned DEFAULT '0',
  `Type4` tinyint unsigned DEFAULT '0',
  `Type5` tinyint unsigned DEFAULT '0',
  `Type6` tinyint unsigned DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`QuestID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.quest_reward_display_spell
CREATE TABLE IF NOT EXISTS `quest_reward_display_spell` (
  `QuestID` int unsigned NOT NULL,
  `Idx` int unsigned NOT NULL,
  `SpellID` int unsigned DEFAULT '0',
  `PlayerConditionID` int unsigned DEFAULT '0',
  `Type` int unsigned NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`QuestID`,`Idx`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.quest_template
CREATE TABLE IF NOT EXISTS `quest_template` (
  `ID` int unsigned NOT NULL DEFAULT '0',
  `QuestType` tinyint unsigned NOT NULL DEFAULT '2',
  `QuestLevel` int NOT NULL DEFAULT '0',
  `QuestScalingFactionGroup` int NOT NULL DEFAULT '0',
  `QuestMaxScalingLevel` int NOT NULL DEFAULT '0',
  `QuestPackageID` int unsigned NOT NULL DEFAULT '0',
  `MinLevel` int NOT NULL DEFAULT '0',
  `QuestSortID` smallint NOT NULL DEFAULT '0',
  `QuestInfoID` smallint unsigned NOT NULL DEFAULT '0',
  `SuggestedGroupNum` tinyint unsigned NOT NULL DEFAULT '0',
  `RewardNextQuest` int unsigned NOT NULL DEFAULT '0',
  `RewardXPDifficulty` int unsigned NOT NULL DEFAULT '0',
  `RewardXPMultiplier` float NOT NULL DEFAULT '1',
  `RewardMoneyDifficulty` int unsigned NOT NULL DEFAULT '0',
  `RewardMoneyMultiplier` float NOT NULL DEFAULT '1',
  `RewardBonusMoney` int unsigned NOT NULL DEFAULT '0',
  `RewardDisplaySpell1` int unsigned NOT NULL DEFAULT '0',
  `RewardDisplaySpell2` int unsigned NOT NULL DEFAULT '0',
  `RewardDisplaySpell3` int unsigned NOT NULL DEFAULT '0',
  `RewardSpell` int unsigned NOT NULL DEFAULT '0',
  `RewardHonor` int unsigned NOT NULL DEFAULT '0',
  `RewardKillHonor` int unsigned NOT NULL DEFAULT '0',
  `StartItem` int unsigned NOT NULL DEFAULT '0',
  `RewardArtifactXPDifficulty` int unsigned NOT NULL DEFAULT '0',
  `RewardArtifactXPMultiplier` float NOT NULL DEFAULT '1',
  `RewardArtifactCategoryID` int unsigned NOT NULL DEFAULT '0',
  `Flags` int unsigned NOT NULL DEFAULT '0',
  `FlagsEx` int unsigned NOT NULL DEFAULT '0',
  `FlagsEx2` int unsigned NOT NULL DEFAULT '0',
  `RewardItem1` int unsigned NOT NULL DEFAULT '0',
  `RewardAmount1` int unsigned NOT NULL DEFAULT '0',
  `RewardItem2` int unsigned NOT NULL DEFAULT '0',
  `RewardAmount2` int unsigned NOT NULL DEFAULT '0',
  `RewardItem3` int unsigned NOT NULL DEFAULT '0',
  `RewardAmount3` int unsigned NOT NULL DEFAULT '0',
  `RewardItem4` int unsigned NOT NULL DEFAULT '0',
  `RewardAmount4` int unsigned NOT NULL DEFAULT '0',
  `ItemDrop1` int unsigned NOT NULL DEFAULT '0',
  `ItemDropQuantity1` int unsigned NOT NULL DEFAULT '0',
  `ItemDrop2` int unsigned NOT NULL DEFAULT '0',
  `ItemDropQuantity2` int unsigned NOT NULL DEFAULT '0',
  `ItemDrop3` int unsigned NOT NULL DEFAULT '0',
  `ItemDropQuantity3` int unsigned NOT NULL DEFAULT '0',
  `ItemDrop4` int unsigned NOT NULL DEFAULT '0',
  `ItemDropQuantity4` int unsigned NOT NULL DEFAULT '0',
  `RewardChoiceItemID1` int unsigned NOT NULL DEFAULT '0',
  `RewardChoiceItemQuantity1` int unsigned NOT NULL DEFAULT '0',
  `RewardChoiceItemDisplayID1` int unsigned NOT NULL DEFAULT '0',
  `RewardChoiceItemID2` int unsigned NOT NULL DEFAULT '0',
  `RewardChoiceItemQuantity2` int unsigned NOT NULL DEFAULT '0',
  `RewardChoiceItemDisplayID2` int unsigned NOT NULL DEFAULT '0',
  `RewardChoiceItemID3` int unsigned NOT NULL DEFAULT '0',
  `RewardChoiceItemQuantity3` int unsigned NOT NULL DEFAULT '0',
  `RewardChoiceItemDisplayID3` int unsigned NOT NULL DEFAULT '0',
  `RewardChoiceItemID4` int unsigned NOT NULL DEFAULT '0',
  `RewardChoiceItemQuantity4` int unsigned NOT NULL DEFAULT '0',
  `RewardChoiceItemDisplayID4` int unsigned NOT NULL DEFAULT '0',
  `RewardChoiceItemID5` int unsigned NOT NULL DEFAULT '0',
  `RewardChoiceItemQuantity5` int unsigned NOT NULL DEFAULT '0',
  `RewardChoiceItemDisplayID5` int unsigned NOT NULL DEFAULT '0',
  `RewardChoiceItemID6` int unsigned NOT NULL DEFAULT '0',
  `RewardChoiceItemQuantity6` int unsigned NOT NULL DEFAULT '0',
  `RewardChoiceItemDisplayID6` int unsigned NOT NULL DEFAULT '0',
  `POIContinent` int unsigned NOT NULL DEFAULT '0',
  `POIx` float NOT NULL DEFAULT '0',
  `POIy` float NOT NULL DEFAULT '0',
  `POIPriority` int NOT NULL DEFAULT '0',
  `RewardTitle` int unsigned NOT NULL DEFAULT '0',
  `RewardArenaPoints` int unsigned NOT NULL DEFAULT '0',
  `RewardSkillLineID` int unsigned NOT NULL DEFAULT '0',
  `RewardNumSkillUps` int unsigned NOT NULL DEFAULT '0',
  `PortraitGiver` int unsigned NOT NULL DEFAULT '0',
  `PortraitGiverMount` int NOT NULL DEFAULT '0',
  `PortraitGiverModelSceneID` int NOT NULL DEFAULT '0',
  `PortraitTurnIn` int unsigned NOT NULL DEFAULT '0',
  `RewardFactionID1` int unsigned NOT NULL DEFAULT '0',
  `RewardFactionValue1` int NOT NULL DEFAULT '0',
  `RewardFactionOverride1` int NOT NULL DEFAULT '0',
  `RewardFactionCapIn1` int NOT NULL DEFAULT '0',
  `RewardFactionID2` int unsigned NOT NULL DEFAULT '0',
  `RewardFactionValue2` int NOT NULL DEFAULT '0',
  `RewardFactionOverride2` int NOT NULL DEFAULT '0',
  `RewardFactionCapIn2` int NOT NULL DEFAULT '0',
  `RewardFactionID3` int unsigned NOT NULL DEFAULT '0',
  `RewardFactionValue3` int NOT NULL DEFAULT '0',
  `RewardFactionOverride3` int NOT NULL DEFAULT '0',
  `RewardFactionCapIn3` int NOT NULL DEFAULT '0',
  `RewardFactionID4` int unsigned NOT NULL DEFAULT '0',
  `RewardFactionValue4` int NOT NULL DEFAULT '0',
  `RewardFactionOverride4` int NOT NULL DEFAULT '0',
  `RewardFactionCapIn4` int NOT NULL DEFAULT '0',
  `RewardFactionID5` int unsigned NOT NULL DEFAULT '0',
  `RewardFactionValue5` int NOT NULL DEFAULT '0',
  `RewardFactionOverride5` int NOT NULL DEFAULT '0',
  `RewardFactionCapIn5` int NOT NULL DEFAULT '0',
  `RewardFactionFlags` int unsigned NOT NULL DEFAULT '0',
  `RewardCurrencyID1` int unsigned NOT NULL DEFAULT '0',
  `RewardCurrencyQty1` int unsigned NOT NULL DEFAULT '0',
  `RewardCurrencyID2` int unsigned NOT NULL DEFAULT '0',
  `RewardCurrencyQty2` int unsigned NOT NULL DEFAULT '0',
  `RewardCurrencyID3` int unsigned NOT NULL DEFAULT '0',
  `RewardCurrencyQty3` int unsigned NOT NULL DEFAULT '0',
  `RewardCurrencyID4` int unsigned NOT NULL DEFAULT '0',
  `RewardCurrencyQty4` int unsigned NOT NULL DEFAULT '0',
  `AcceptedSoundKitID` int unsigned NOT NULL DEFAULT '0',
  `CompleteSoundKitID` int unsigned NOT NULL DEFAULT '0',
  `AreaGroupID` int unsigned NOT NULL DEFAULT '0',
  `TimeAllowed` bigint NOT NULL DEFAULT '0',
  `AllowableRaces` bigint unsigned DEFAULT '0',
  `TreasurePickerID` int NOT NULL DEFAULT '0',
  `Expansion` int NOT NULL DEFAULT '0',
  `ManagedWorldStateID` int NOT NULL DEFAULT '0',
  `QuestSessionBonus` int NOT NULL DEFAULT '0',
  `LogTitle` mediumtext COLLATE utf8mb4_unicode_ci,
  `LogDescription` mediumtext COLLATE utf8mb4_unicode_ci,
  `QuestDescription` mediumtext COLLATE utf8mb4_unicode_ci,
  `AreaDescription` mediumtext COLLATE utf8mb4_unicode_ci,
  `PortraitGiverText` mediumtext COLLATE utf8mb4_unicode_ci,
  `PortraitGiverName` mediumtext COLLATE utf8mb4_unicode_ci,
  `PortraitTurnInText` mediumtext COLLATE utf8mb4_unicode_ci,
  `PortraitTurnInName` mediumtext COLLATE utf8mb4_unicode_ci,
  `QuestCompletionLog` mediumtext COLLATE utf8mb4_unicode_ci,
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Quest System';

-- Data exporting was unselected.

-- Dumping structure for table world.quest_template_addon
CREATE TABLE IF NOT EXISTS `quest_template_addon` (
  `ID` int unsigned NOT NULL DEFAULT '0',
  `MaxLevel` tinyint unsigned NOT NULL DEFAULT '0',
  `AllowableClasses` int unsigned NOT NULL DEFAULT '0',
  `SourceSpellID` int unsigned NOT NULL DEFAULT '0',
  `PrevQuestID` int NOT NULL DEFAULT '0',
  `NextQuestID` int unsigned NOT NULL DEFAULT '0',
  `ExclusiveGroup` int NOT NULL DEFAULT '0',
  `BreadcrumbForQuestId` int NOT NULL DEFAULT '0',
  `RewardMailTemplateID` int unsigned NOT NULL DEFAULT '0',
  `RewardMailDelay` int unsigned NOT NULL DEFAULT '0',
  `RequiredSkillID` smallint unsigned NOT NULL DEFAULT '0',
  `RequiredSkillPoints` smallint unsigned NOT NULL DEFAULT '0',
  `RequiredMinRepFaction` smallint unsigned NOT NULL DEFAULT '0',
  `RequiredMaxRepFaction` smallint unsigned NOT NULL DEFAULT '0',
  `RequiredMinRepValue` int NOT NULL DEFAULT '0',
  `RequiredMaxRepValue` int NOT NULL DEFAULT '0',
  `ProvidedItemCount` tinyint unsigned NOT NULL DEFAULT '0',
  `SpecialFlags` tinyint unsigned NOT NULL DEFAULT '0',
  `ScriptName` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.quest_template_locale
CREATE TABLE IF NOT EXISTS `quest_template_locale` (
  `ID` int unsigned NOT NULL DEFAULT '0',
  `locale` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `LogTitle` mediumtext COLLATE utf8mb4_unicode_ci,
  `LogDescription` mediumtext COLLATE utf8mb4_unicode_ci,
  `QuestDescription` mediumtext COLLATE utf8mb4_unicode_ci,
  `AreaDescription` mediumtext COLLATE utf8mb4_unicode_ci,
  `PortraitGiverText` mediumtext COLLATE utf8mb4_unicode_ci,
  `PortraitGiverName` mediumtext COLLATE utf8mb4_unicode_ci,
  `PortraitTurnInText` mediumtext COLLATE utf8mb4_unicode_ci,
  `PortraitTurnInName` mediumtext COLLATE utf8mb4_unicode_ci,
  `QuestCompletionLog` mediumtext COLLATE utf8mb4_unicode_ci,
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ID`,`locale`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.quest_visual_effect
CREATE TABLE IF NOT EXISTS `quest_visual_effect` (
  `ID` int unsigned NOT NULL DEFAULT '0',
  `Index` tinyint unsigned NOT NULL DEFAULT '0',
  `VisualEffect` int NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ID`,`Index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.race_unlock_requirement
CREATE TABLE IF NOT EXISTS `race_unlock_requirement` (
  `raceID` tinyint unsigned NOT NULL DEFAULT '0',
  `expansion` tinyint unsigned NOT NULL DEFAULT '0',
  `achievementId` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`raceID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.reference_loot_template
CREATE TABLE IF NOT EXISTS `reference_loot_template` (
  `Entry` int unsigned NOT NULL DEFAULT '0',
  `Item` int unsigned NOT NULL DEFAULT '0',
  `Reference` int unsigned NOT NULL DEFAULT '0',
  `Chance` float NOT NULL DEFAULT '100',
  `QuestRequired` tinyint(1) NOT NULL DEFAULT '0',
  `LootMode` smallint unsigned NOT NULL DEFAULT '1',
  `GroupId` tinyint unsigned NOT NULL DEFAULT '0',
  `MinCount` tinyint unsigned NOT NULL DEFAULT '1',
  `MaxCount` tinyint unsigned NOT NULL DEFAULT '1',
  `Comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`Entry`,`Item`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Loot System';

-- Data exporting was unselected.

-- Dumping structure for table world.reputation_reward_rate
CREATE TABLE IF NOT EXISTS `reputation_reward_rate` (
  `faction` int unsigned NOT NULL DEFAULT '0',
  `quest_rate` float NOT NULL DEFAULT '1',
  `quest_daily_rate` float NOT NULL DEFAULT '1',
  `quest_weekly_rate` float NOT NULL DEFAULT '1',
  `quest_monthly_rate` float NOT NULL DEFAULT '1',
  `quest_repeatable_rate` float NOT NULL DEFAULT '1',
  `creature_rate` float NOT NULL DEFAULT '1',
  `spell_rate` float NOT NULL DEFAULT '1',
  PRIMARY KEY (`faction`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.reputation_spillover_template
CREATE TABLE IF NOT EXISTS `reputation_spillover_template` (
  `faction` smallint unsigned NOT NULL DEFAULT '0' COMMENT 'faction entry',
  `faction1` smallint unsigned NOT NULL DEFAULT '0' COMMENT 'faction to give spillover for',
  `rate_1` float NOT NULL DEFAULT '0' COMMENT 'the given rep points * rate',
  `rank_1` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'max rank,above this will not give any spillover',
  `faction2` smallint unsigned NOT NULL DEFAULT '0',
  `rate_2` float NOT NULL DEFAULT '0',
  `rank_2` tinyint unsigned NOT NULL DEFAULT '0',
  `faction3` smallint unsigned NOT NULL DEFAULT '0',
  `rate_3` float NOT NULL DEFAULT '0',
  `rank_3` tinyint unsigned NOT NULL DEFAULT '0',
  `faction4` smallint unsigned NOT NULL DEFAULT '0',
  `rate_4` float NOT NULL DEFAULT '0',
  `rank_4` tinyint unsigned NOT NULL DEFAULT '0',
  `faction5` smallint unsigned NOT NULL DEFAULT '0',
  `rate_5` float NOT NULL DEFAULT '0',
  `rank_5` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`faction`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Reputation spillover reputation gain';

-- Data exporting was unselected.

-- Dumping structure for table world.scenarios
CREATE TABLE IF NOT EXISTS `scenarios` (
  `map` int unsigned NOT NULL DEFAULT '0',
  `difficulty` tinyint unsigned NOT NULL DEFAULT '0',
  `scenario_A` int unsigned NOT NULL DEFAULT '0',
  `scenario_H` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`map`,`difficulty`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.scenario_poi
CREATE TABLE IF NOT EXISTS `scenario_poi` (
  `CriteriaTreeID` int NOT NULL DEFAULT '0',
  `BlobIndex` int NOT NULL DEFAULT '0',
  `Idx1` int NOT NULL DEFAULT '0',
  `MapID` int NOT NULL DEFAULT '0',
  `UiMapID` int NOT NULL DEFAULT '0',
  `Priority` int NOT NULL DEFAULT '0',
  `Flags` int NOT NULL DEFAULT '0',
  `WorldEffectID` int NOT NULL DEFAULT '0',
  `PlayerConditionID` int NOT NULL DEFAULT '0',
  `NavigationPlayerConditionID` int NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`CriteriaTreeID`,`BlobIndex`,`Idx1`),
  KEY `idx` (`CriteriaTreeID`,`BlobIndex`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.scenario_poi_points
CREATE TABLE IF NOT EXISTS `scenario_poi_points` (
  `CriteriaTreeID` int NOT NULL DEFAULT '0',
  `Idx1` int NOT NULL DEFAULT '0',
  `Idx2` int NOT NULL DEFAULT '0',
  `X` int NOT NULL DEFAULT '0',
  `Y` int NOT NULL DEFAULT '0',
  `Z` int NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`CriteriaTreeID`,`Idx1`,`Idx2`),
  KEY `questId_id` (`CriteriaTreeID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.scene_template
CREATE TABLE IF NOT EXISTS `scene_template` (
  `SceneId` int unsigned NOT NULL,
  `Flags` int unsigned NOT NULL DEFAULT '0',
  `ScriptPackageID` int unsigned NOT NULL DEFAULT '0',
  `Encrypted` tinyint unsigned NOT NULL DEFAULT '0',
  `ScriptName` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`SceneId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.script_spline_chain_meta
CREATE TABLE IF NOT EXISTS `script_spline_chain_meta` (
  `entry` int unsigned NOT NULL,
  `chainId` smallint unsigned NOT NULL,
  `splineId` tinyint unsigned NOT NULL,
  `expectedDuration` int unsigned NOT NULL,
  `msUntilNext` int unsigned NOT NULL,
  `velocity` float NOT NULL DEFAULT '0',
  PRIMARY KEY (`entry`,`chainId`,`splineId`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.script_spline_chain_waypoints
CREATE TABLE IF NOT EXISTS `script_spline_chain_waypoints` (
  `entry` int unsigned NOT NULL,
  `chainId` smallint unsigned NOT NULL,
  `splineId` tinyint unsigned NOT NULL,
  `wpId` tinyint unsigned NOT NULL,
  `x` float NOT NULL,
  `y` float NOT NULL,
  `z` float NOT NULL,
  PRIMARY KEY (`entry`,`chainId`,`splineId`,`wpId`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.script_waypoint
CREATE TABLE IF NOT EXISTS `script_waypoint` (
  `entry` int unsigned NOT NULL DEFAULT '0' COMMENT 'creature_template entry',
  `pointid` int unsigned NOT NULL DEFAULT '0',
  `location_x` float NOT NULL DEFAULT '0',
  `location_y` float NOT NULL DEFAULT '0',
  `location_z` float NOT NULL DEFAULT '0',
  `waittime` int unsigned NOT NULL DEFAULT '0' COMMENT 'waittime in millisecs',
  `point_comment` mediumtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`entry`,`pointid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Script Creature waypoints';

-- Data exporting was unselected.

-- Dumping structure for table world.serverside_spell
CREATE TABLE IF NOT EXISTS `serverside_spell` (
  `Id` int unsigned NOT NULL,
  `DifficultyID` int NOT NULL DEFAULT '0',
  `CategoryId` int unsigned NOT NULL DEFAULT '0',
  `Dispel` int unsigned NOT NULL DEFAULT '0',
  `Mechanic` int unsigned NOT NULL DEFAULT '0',
  `Attributes` int unsigned NOT NULL DEFAULT '0',
  `AttributesEx` int unsigned NOT NULL DEFAULT '0',
  `AttributesEx2` int unsigned NOT NULL DEFAULT '0',
  `AttributesEx3` int unsigned NOT NULL DEFAULT '0',
  `AttributesEx4` int unsigned NOT NULL DEFAULT '0',
  `AttributesEx5` int unsigned NOT NULL DEFAULT '0',
  `AttributesEx6` int unsigned NOT NULL DEFAULT '0',
  `AttributesEx7` int unsigned NOT NULL DEFAULT '0',
  `AttributesEx8` int unsigned NOT NULL DEFAULT '0',
  `AttributesEx9` int unsigned NOT NULL DEFAULT '0',
  `AttributesEx10` int unsigned NOT NULL DEFAULT '0',
  `AttributesEx11` int unsigned NOT NULL DEFAULT '0',
  `AttributesEx12` int unsigned NOT NULL DEFAULT '0',
  `AttributesEx13` int unsigned NOT NULL DEFAULT '0',
  `AttributesEx14` int unsigned NOT NULL DEFAULT '0',
  `Stances` bigint unsigned NOT NULL DEFAULT '0',
  `StancesNot` bigint unsigned NOT NULL DEFAULT '0',
  `Targets` int unsigned NOT NULL DEFAULT '0',
  `TargetCreatureType` int unsigned NOT NULL DEFAULT '0',
  `RequiresSpellFocus` int unsigned NOT NULL DEFAULT '0',
  `FacingCasterFlags` int unsigned NOT NULL DEFAULT '0',
  `CasterAuraState` int unsigned NOT NULL DEFAULT '0',
  `TargetAuraState` int unsigned NOT NULL DEFAULT '0',
  `ExcludeCasterAuraState` int unsigned NOT NULL DEFAULT '0',
  `ExcludeTargetAuraState` int unsigned NOT NULL DEFAULT '0',
  `CasterAuraSpell` int unsigned NOT NULL DEFAULT '0',
  `TargetAuraSpell` int unsigned NOT NULL DEFAULT '0',
  `ExcludeCasterAuraSpell` int unsigned NOT NULL DEFAULT '0',
  `ExcludeTargetAuraSpell` int unsigned NOT NULL DEFAULT '0',
  `CasterAuraType` int NOT NULL DEFAULT '0',
  `TargetAuraType` int NOT NULL DEFAULT '0',
  `ExcludeCasterAuraType` int NOT NULL DEFAULT '0',
  `ExcludeTargetAuraType` int NOT NULL DEFAULT '0',
  `CastingTimeIndex` int unsigned NOT NULL DEFAULT '1',
  `RecoveryTime` int unsigned NOT NULL DEFAULT '0',
  `CategoryRecoveryTime` int unsigned NOT NULL DEFAULT '0',
  `StartRecoveryCategory` int unsigned NOT NULL DEFAULT '0',
  `StartRecoveryTime` int unsigned NOT NULL DEFAULT '0',
  `InterruptFlags` int unsigned NOT NULL DEFAULT '0',
  `AuraInterruptFlags1` int unsigned NOT NULL DEFAULT '0',
  `AuraInterruptFlags2` int unsigned NOT NULL DEFAULT '0',
  `ChannelInterruptFlags1` int unsigned NOT NULL DEFAULT '0',
  `ChannelInterruptFlags2` int unsigned NOT NULL DEFAULT '0',
  `ProcFlags` int unsigned NOT NULL DEFAULT '0',
  `ProcFlags2` int unsigned NOT NULL DEFAULT '0',
  `ProcChance` int unsigned NOT NULL DEFAULT '0',
  `ProcCharges` int unsigned NOT NULL DEFAULT '0',
  `ProcCooldown` int unsigned NOT NULL DEFAULT '0',
  `ProcBasePPM` float NOT NULL DEFAULT '0',
  `MaxLevel` int unsigned NOT NULL DEFAULT '0',
  `BaseLevel` int unsigned NOT NULL DEFAULT '0',
  `SpellLevel` int unsigned NOT NULL DEFAULT '0',
  `DurationIndex` int unsigned NOT NULL DEFAULT '0',
  `RangeIndex` int unsigned NOT NULL DEFAULT '1',
  `Speed` float NOT NULL DEFAULT '0',
  `LaunchDelay` float NOT NULL DEFAULT '0',
  `StackAmount` int unsigned NOT NULL DEFAULT '0',
  `EquippedItemClass` int NOT NULL DEFAULT '-1',
  `EquippedItemSubClassMask` int NOT NULL DEFAULT '0',
  `EquippedItemInventoryTypeMask` int NOT NULL DEFAULT '0',
  `ContentTuningId` int unsigned NOT NULL DEFAULT '0',
  `SpellName` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ConeAngle` float NOT NULL DEFAULT '0',
  `ConeWidth` float NOT NULL DEFAULT '0',
  `MaxTargetLevel` int unsigned NOT NULL DEFAULT '0',
  `MaxAffectedTargets` int unsigned NOT NULL DEFAULT '0',
  `SpellFamilyName` int unsigned NOT NULL DEFAULT '0',
  `SpellFamilyFlags1` int unsigned NOT NULL DEFAULT '0',
  `SpellFamilyFlags2` int unsigned NOT NULL DEFAULT '0',
  `SpellFamilyFlags3` int unsigned NOT NULL DEFAULT '0',
  `SpellFamilyFlags4` int unsigned NOT NULL DEFAULT '0',
  `DmgClass` int unsigned NOT NULL DEFAULT '0',
  `PreventionType` int unsigned NOT NULL DEFAULT '0',
  `AreaGroupId` int NOT NULL DEFAULT '0',
  `SchoolMask` int unsigned NOT NULL DEFAULT '0',
  `ChargeCategoryId` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`Id`,`DifficultyID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.serverside_spell_effect
CREATE TABLE IF NOT EXISTS `serverside_spell_effect` (
  `SpellID` int unsigned NOT NULL DEFAULT '0',
  `EffectIndex` int NOT NULL DEFAULT '0',
  `DifficultyID` int NOT NULL DEFAULT '0',
  `Effect` int NOT NULL DEFAULT '0',
  `EffectAura` smallint NOT NULL DEFAULT '0',
  `EffectAmplitude` float NOT NULL DEFAULT '0',
  `EffectAttributes` int NOT NULL DEFAULT '0',
  `EffectAuraPeriod` int NOT NULL DEFAULT '0',
  `EffectBonusCoefficient` float NOT NULL DEFAULT '0',
  `EffectChainAmplitude` float NOT NULL DEFAULT '0',
  `EffectChainTargets` int NOT NULL DEFAULT '0',
  `EffectItemType` int NOT NULL DEFAULT '0',
  `EffectMechanic` int NOT NULL DEFAULT '0',
  `EffectPointsPerResource` float NOT NULL DEFAULT '0',
  `EffectPosFacing` float NOT NULL DEFAULT '0',
  `EffectRealPointsPerLevel` float NOT NULL DEFAULT '0',
  `EffectTriggerSpell` int NOT NULL DEFAULT '0',
  `BonusCoefficientFromAP` float NOT NULL DEFAULT '0',
  `PvpMultiplier` float NOT NULL DEFAULT '0',
  `Coefficient` float NOT NULL DEFAULT '0',
  `Variance` float NOT NULL DEFAULT '0',
  `ResourceCoefficient` float NOT NULL DEFAULT '0',
  `GroupSizeBasePointsCoefficient` float NOT NULL DEFAULT '0',
  `EffectBasePoints` float NOT NULL DEFAULT '0',
  `EffectMiscValue1` int NOT NULL DEFAULT '0',
  `EffectMiscValue2` int NOT NULL DEFAULT '0',
  `EffectRadiusIndex1` int unsigned NOT NULL DEFAULT '0',
  `EffectRadiusIndex2` int unsigned NOT NULL DEFAULT '0',
  `EffectSpellClassMask1` int NOT NULL DEFAULT '0',
  `EffectSpellClassMask2` int NOT NULL DEFAULT '0',
  `EffectSpellClassMask3` int NOT NULL DEFAULT '0',
  `EffectSpellClassMask4` int NOT NULL DEFAULT '0',
  `ImplicitTarget1` smallint NOT NULL DEFAULT '0',
  `ImplicitTarget2` smallint NOT NULL DEFAULT '0',
  PRIMARY KEY (`SpellID`,`EffectIndex`,`DifficultyID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.skill_discovery_template
CREATE TABLE IF NOT EXISTS `skill_discovery_template` (
  `spellId` int unsigned NOT NULL DEFAULT '0' COMMENT 'SpellId of the discoverable spell',
  `reqSpell` int unsigned NOT NULL DEFAULT '0' COMMENT 'spell requirement',
  `reqSkillValue` smallint unsigned NOT NULL DEFAULT '0' COMMENT 'skill points requirement',
  `chance` float NOT NULL DEFAULT '0' COMMENT 'chance to discover',
  PRIMARY KEY (`spellId`,`reqSpell`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Skill Discovery System';

-- Data exporting was unselected.

-- Dumping structure for table world.skill_extra_item_template
CREATE TABLE IF NOT EXISTS `skill_extra_item_template` (
  `spellId` int unsigned NOT NULL DEFAULT '0' COMMENT 'SpellId of the item creation spell',
  `requiredSpecialization` int unsigned NOT NULL DEFAULT '0' COMMENT 'Specialization spell id',
  `additionalCreateChance` float NOT NULL DEFAULT '0' COMMENT 'chance to create add',
  `additionalMaxNum` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'max num of adds',
  PRIMARY KEY (`spellId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Skill Specialization System';

-- Data exporting was unselected.

-- Dumping structure for table world.skill_fishing_base_level
CREATE TABLE IF NOT EXISTS `skill_fishing_base_level` (
  `entry` int unsigned NOT NULL DEFAULT '0' COMMENT 'Area identifier',
  `skill` smallint NOT NULL DEFAULT '0' COMMENT 'Base skill level requirement',
  PRIMARY KEY (`entry`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Fishing system';

-- Data exporting was unselected.

-- Dumping structure for table world.skill_perfect_item_template
CREATE TABLE IF NOT EXISTS `skill_perfect_item_template` (
  `spellId` int unsigned NOT NULL DEFAULT '0' COMMENT 'SpellId of the item creation spell',
  `requiredSpecialization` int unsigned NOT NULL DEFAULT '0' COMMENT 'Specialization spell id',
  `perfectCreateChance` float NOT NULL DEFAULT '0' COMMENT 'chance to create the perfect item instead',
  `perfectItemType` int unsigned NOT NULL DEFAULT '0' COMMENT 'perfect item type to create instead',
  PRIMARY KEY (`spellId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Crafting Perfection System';

-- Data exporting was unselected.

-- Dumping structure for table world.skill_tiers
CREATE TABLE IF NOT EXISTS `skill_tiers` (
  `ID` int unsigned NOT NULL DEFAULT '0',
  `Value1` int unsigned NOT NULL DEFAULT '0',
  `Value2` int unsigned NOT NULL DEFAULT '0',
  `Value3` int unsigned NOT NULL DEFAULT '0',
  `Value4` int unsigned NOT NULL DEFAULT '0',
  `Value5` int unsigned NOT NULL DEFAULT '0',
  `Value6` int unsigned NOT NULL DEFAULT '0',
  `Value7` int unsigned NOT NULL DEFAULT '0',
  `Value8` int unsigned NOT NULL DEFAULT '0',
  `Value9` int unsigned NOT NULL DEFAULT '0',
  `Value10` int unsigned NOT NULL DEFAULT '0',
  `Value11` int unsigned NOT NULL DEFAULT '0',
  `Value12` int unsigned NOT NULL DEFAULT '0',
  `Value13` int unsigned NOT NULL DEFAULT '0',
  `Value14` int unsigned NOT NULL DEFAULT '0',
  `Value15` int unsigned NOT NULL DEFAULT '0',
  `Value16` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.skinning_loot_template
CREATE TABLE IF NOT EXISTS `skinning_loot_template` (
  `Entry` int unsigned NOT NULL DEFAULT '0',
  `Item` int unsigned NOT NULL DEFAULT '0',
  `Reference` int unsigned NOT NULL DEFAULT '0',
  `Chance` float NOT NULL DEFAULT '100',
  `QuestRequired` tinyint(1) NOT NULL DEFAULT '0',
  `LootMode` smallint unsigned NOT NULL DEFAULT '1',
  `GroupId` tinyint unsigned NOT NULL DEFAULT '0',
  `MinCount` tinyint unsigned NOT NULL DEFAULT '1',
  `MaxCount` tinyint unsigned NOT NULL DEFAULT '1',
  `Comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`Entry`,`Item`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Loot System';

-- Data exporting was unselected.

-- Dumping structure for table world.smart_scripts
CREATE TABLE IF NOT EXISTS `smart_scripts` (
  `entryorguid` bigint NOT NULL DEFAULT '0',
  `source_type` tinyint unsigned NOT NULL DEFAULT '0',
  `id` smallint unsigned NOT NULL DEFAULT '0',
  `link` smallint unsigned NOT NULL DEFAULT '0',
  `Difficulties` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `event_type` tinyint unsigned NOT NULL DEFAULT '0',
  `event_phase_mask` smallint unsigned NOT NULL DEFAULT '0',
  `event_chance` tinyint unsigned NOT NULL DEFAULT '100',
  `event_flags` smallint unsigned NOT NULL DEFAULT '0',
  `event_param1` int unsigned NOT NULL DEFAULT '0',
  `event_param2` int unsigned NOT NULL DEFAULT '0',
  `event_param3` int unsigned NOT NULL DEFAULT '0',
  `event_param4` int unsigned NOT NULL DEFAULT '0',
  `event_param5` int unsigned NOT NULL DEFAULT '0',
  `event_param_string` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `action_type` tinyint unsigned NOT NULL DEFAULT '0',
  `action_param1` int unsigned NOT NULL DEFAULT '0',
  `action_param2` int unsigned NOT NULL DEFAULT '0',
  `action_param3` int unsigned NOT NULL DEFAULT '0',
  `action_param4` int unsigned NOT NULL DEFAULT '0',
  `action_param5` int unsigned NOT NULL DEFAULT '0',
  `action_param6` int unsigned NOT NULL DEFAULT '0',
  `action_param7` int unsigned NOT NULL DEFAULT '0',
  `target_type` tinyint unsigned NOT NULL DEFAULT '0',
  `target_param1` int unsigned NOT NULL DEFAULT '0',
  `target_param2` int unsigned NOT NULL DEFAULT '0',
  `target_param3` int unsigned NOT NULL DEFAULT '0',
  `target_param4` int unsigned NOT NULL DEFAULT '0',
  `target_x` float NOT NULL DEFAULT '0',
  `target_y` float NOT NULL DEFAULT '0',
  `target_z` float NOT NULL DEFAULT '0',
  `target_o` float NOT NULL DEFAULT '0',
  `comment` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Event Comment',
  PRIMARY KEY (`entryorguid`,`source_type`,`id`,`link`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.spawn_group
CREATE TABLE IF NOT EXISTS `spawn_group` (
  `groupId` int unsigned NOT NULL,
  `spawnType` tinyint unsigned NOT NULL,
  `spawnId` bigint unsigned NOT NULL,
  PRIMARY KEY (`groupId`,`spawnType`,`spawnId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.spawn_group_template
CREATE TABLE IF NOT EXISTS `spawn_group_template` (
  `groupId` int unsigned NOT NULL,
  `groupName` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `groupFlags` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`groupId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.spellauraoptions335
CREATE TABLE IF NOT EXISTS `spellauraoptions335` (
  `spell_id` int unsigned NOT NULL,
  `cumulative_aura` int unsigned DEFAULT NULL,
  `proc_chance` int unsigned DEFAULT NULL,
  `proc_charges` int unsigned DEFAULT NULL,
  `proc_type_mask_0` int unsigned DEFAULT NULL,
  PRIMARY KEY (`spell_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.spell_area
CREATE TABLE IF NOT EXISTS `spell_area` (
  `spell` int unsigned NOT NULL DEFAULT '0',
  `area` int unsigned NOT NULL DEFAULT '0',
  `quest_start` int unsigned NOT NULL DEFAULT '0',
  `quest_end` int unsigned NOT NULL DEFAULT '0',
  `aura_spell` int NOT NULL DEFAULT '0',
  `racemask` bigint unsigned NOT NULL DEFAULT '0',
  `gender` tinyint unsigned NOT NULL DEFAULT '2',
  `flags` tinyint unsigned NOT NULL DEFAULT '3',
  `quest_start_status` int NOT NULL DEFAULT '64',
  `quest_end_status` int NOT NULL DEFAULT '11',
  PRIMARY KEY (`spell`,`area`,`quest_start`,`aura_spell`,`racemask`,`gender`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.spell_bonus_data
CREATE TABLE IF NOT EXISTS `spell_bonus_data` (
  `entry` int unsigned NOT NULL DEFAULT '0',
  `direct_bonus` float NOT NULL DEFAULT '0',
  `dot_bonus` float NOT NULL DEFAULT '0',
  `ap_bonus` float NOT NULL DEFAULT '0',
  `ap_dot_bonus` float NOT NULL DEFAULT '0',
  `comments` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`entry`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.spell_custom_attr
CREATE TABLE IF NOT EXISTS `spell_custom_attr` (
  `entry` int unsigned NOT NULL DEFAULT '0' COMMENT 'spell id',
  `attributes` int unsigned NOT NULL DEFAULT '0' COMMENT 'SpellCustomAttributes',
  PRIMARY KEY (`entry`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='SpellInfo custom attributes';

-- Data exporting was unselected.

-- Dumping structure for table world.spell_dbc_effect
CREATE TABLE IF NOT EXISTS `spell_dbc_effect` (
  `SpellID` int DEFAULT NULL,
  `Effect1` int DEFAULT NULL,
  `Effect2` int DEFAULT NULL,
  `Effect3` int DEFAULT NULL,
  `EffectDieSides1` int DEFAULT NULL,
  `EffectDieSides2` int DEFAULT NULL,
  `EffectDieSides3` int DEFAULT NULL,
  `EffectRealPointsPerLevel1` float DEFAULT NULL,
  `EffectRealPointsPerLevel2` float DEFAULT NULL,
  `EffectRealPointsPerLevel3` float DEFAULT NULL,
  `EffectBasePoints1` int DEFAULT NULL,
  `EffectBasePoints2` int DEFAULT NULL,
  `EffectBasePoints3` int DEFAULT NULL,
  `EffectMechanic1` int DEFAULT NULL,
  `EffectMechanic2` int DEFAULT NULL,
  `EffectMechanic3` int DEFAULT NULL,
  `EffectImplicitTargetA1` int DEFAULT NULL,
  `EffectImplicitTargetA2` int DEFAULT NULL,
  `EffectImplicitTargetA3` int DEFAULT NULL,
  `EffectImplicitTargetB1` int DEFAULT NULL,
  `EffectImplicitTargetB2` int DEFAULT NULL,
  `EffectImplicitTargetB3` int DEFAULT NULL,
  `EffectRadiusIndex1` int DEFAULT NULL,
  `EffectRadiusIndex2` int DEFAULT NULL,
  `EffectRadiusIndex3` int DEFAULT NULL,
  `EffectApplyAuraName1` int DEFAULT NULL,
  `EffectApplyAuraName2` int DEFAULT NULL,
  `EffectApplyAuraName3` int DEFAULT NULL,
  `EffectAuraPeriod1` int DEFAULT NULL,
  `EffectAuraPeriod2` int DEFAULT NULL,
  `EffectAuraPeriod3` int DEFAULT NULL,
  `EffectAmplitude1` float DEFAULT NULL,
  `EffectAmplitude2` float DEFAULT NULL,
  `EffectAmplitude3` float DEFAULT NULL,
  `EffectItemType1` int DEFAULT NULL,
  `EffectItemType2` int DEFAULT NULL,
  `EffectItemType3` int DEFAULT NULL,
  `EffectMiscValue1` int DEFAULT NULL,
  `EffectMiscValue2` int DEFAULT NULL,
  `EffectMiscValue3` int DEFAULT NULL,
  `EffectMiscValueB1` int DEFAULT NULL,
  `EffectMiscValueB2` int DEFAULT NULL,
  `EffectMiscValueB3` int DEFAULT NULL,
  `EffectTriggerSpell1` int DEFAULT NULL,
  `EffectTriggerSpell2` int DEFAULT NULL,
  `EffectTriggerSpell3` int DEFAULT NULL,
  `EffectSpellClassMaskA1` int DEFAULT NULL,
  `EffectSpellClassMaskA2` int DEFAULT NULL,
  `EffectSpellClassMaskA3` int DEFAULT NULL,
  `EffectSpellClassMaskB1` int DEFAULT NULL,
  `EffectSpellClassMaskB2` int DEFAULT NULL,
  `EffectSpellClassMaskB3` int DEFAULT NULL,
  `EffectSpellClassMaskC1` int DEFAULT NULL,
  `EffectSpellClassMaskC2` int DEFAULT NULL,
  `EffectSpellClassMaskC3` int DEFAULT NULL,
  `DmgMultiplier1` float DEFAULT NULL,
  `DmgMultiplier2` float DEFAULT NULL,
  `DmgMultiplier3` float DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.spell_enchant_proc_data
CREATE TABLE IF NOT EXISTS `spell_enchant_proc_data` (
  `EnchantID` int unsigned NOT NULL,
  `Chance` float NOT NULL DEFAULT '0',
  `ProcsPerMinute` float NOT NULL DEFAULT '0',
  `HitMask` int unsigned NOT NULL DEFAULT '0',
  `AttributesMask` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`EnchantID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Spell enchant proc data';

-- Data exporting was unselected.

-- Dumping structure for table world.spell_group
CREATE TABLE IF NOT EXISTS `spell_group` (
  `id` int unsigned NOT NULL DEFAULT '0',
  `spell_id` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`,`spell_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Spell System';

-- Data exporting was unselected.

-- Dumping structure for table world.spell_group_stack_rules
CREATE TABLE IF NOT EXISTS `spell_group_stack_rules` (
  `group_id` int unsigned NOT NULL DEFAULT '0',
  `stack_rule` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.spell_learn_spell
CREATE TABLE IF NOT EXISTS `spell_learn_spell` (
  `entry` int unsigned NOT NULL DEFAULT '0',
  `SpellID` int unsigned NOT NULL DEFAULT '0',
  `Active` tinyint unsigned NOT NULL DEFAULT '1',
  PRIMARY KEY (`entry`,`SpellID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Item System';

-- Data exporting was unselected.

-- Dumping structure for table world.spell_linked_spell
CREATE TABLE IF NOT EXISTS `spell_linked_spell` (
  `spell_trigger` int NOT NULL,
  `spell_effect` int NOT NULL DEFAULT '0',
  `type` tinyint unsigned NOT NULL DEFAULT '0',
  `comment` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  UNIQUE KEY `trigger_effect_type` (`spell_trigger`,`spell_effect`,`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Spell System';

-- Data exporting was unselected.

-- Dumping structure for table world.spell_loot_template
CREATE TABLE IF NOT EXISTS `spell_loot_template` (
  `Entry` int unsigned NOT NULL DEFAULT '0',
  `Item` int unsigned NOT NULL DEFAULT '0',
  `Reference` int unsigned NOT NULL DEFAULT '0',
  `Chance` float NOT NULL DEFAULT '100',
  `QuestRequired` tinyint(1) NOT NULL DEFAULT '0',
  `LootMode` smallint unsigned NOT NULL DEFAULT '1',
  `GroupId` tinyint unsigned NOT NULL DEFAULT '0',
  `MinCount` tinyint unsigned NOT NULL DEFAULT '1',
  `MaxCount` tinyint unsigned NOT NULL DEFAULT '1',
  `Comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`Entry`,`Item`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Loot System';

-- Data exporting was unselected.

-- Dumping structure for table world.spell_pet_auras
CREATE TABLE IF NOT EXISTS `spell_pet_auras` (
  `spell` int unsigned NOT NULL COMMENT 'dummy spell id',
  `effectId` tinyint unsigned NOT NULL DEFAULT '0',
  `pet` int unsigned NOT NULL DEFAULT '0' COMMENT 'pet id; 0 = all',
  `aura` int unsigned NOT NULL COMMENT 'pet aura id',
  PRIMARY KEY (`spell`,`effectId`,`pet`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.spell_proc
CREATE TABLE IF NOT EXISTS `spell_proc` (
  `SpellId` int NOT NULL DEFAULT '0',
  `SchoolMask` tinyint unsigned NOT NULL DEFAULT '0',
  `SpellFamilyName` smallint unsigned NOT NULL DEFAULT '0',
  `SpellFamilyMask0` int unsigned NOT NULL DEFAULT '0',
  `SpellFamilyMask1` int unsigned NOT NULL DEFAULT '0',
  `SpellFamilyMask2` int unsigned NOT NULL DEFAULT '0',
  `SpellFamilyMask3` int unsigned NOT NULL DEFAULT '0',
  `ProcFlags` int unsigned NOT NULL DEFAULT '0',
  `ProcFlags2` int unsigned NOT NULL DEFAULT '0',
  `SpellTypeMask` int unsigned NOT NULL DEFAULT '0',
  `SpellPhaseMask` int unsigned NOT NULL DEFAULT '0',
  `HitMask` int unsigned NOT NULL DEFAULT '0',
  `AttributesMask` int unsigned NOT NULL DEFAULT '0',
  `DisableEffectsMask` int unsigned NOT NULL DEFAULT '0',
  `ProcsPerMinute` float NOT NULL DEFAULT '0',
  `Chance` float NOT NULL DEFAULT '0',
  `Cooldown` int unsigned NOT NULL DEFAULT '0',
  `Charges` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`SpellId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.spell_ranks
CREATE TABLE IF NOT EXISTS `spell_ranks` (
  `first_spell_id` int unsigned NOT NULL DEFAULT '0',
  `spell_id` int unsigned NOT NULL DEFAULT '0',
  `rank` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`first_spell_id`,`rank`),
  UNIQUE KEY `spell_id` (`spell_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Spell Rank Data';

-- Data exporting was unselected.

-- Dumping structure for table world.spell_required
CREATE TABLE IF NOT EXISTS `spell_required` (
  `spell_id` int NOT NULL DEFAULT '0',
  `req_spell` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`spell_id`,`req_spell`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Spell Additinal Data';

-- Data exporting was unselected.

-- Dumping structure for table world.spell_scripts
CREATE TABLE IF NOT EXISTS `spell_scripts` (
  `id` int unsigned NOT NULL DEFAULT '0',
  `effIndex` tinyint unsigned NOT NULL DEFAULT '0',
  `delay` int unsigned NOT NULL DEFAULT '0',
  `command` int unsigned NOT NULL DEFAULT '0',
  `datalong` int unsigned NOT NULL DEFAULT '0',
  `datalong2` int unsigned NOT NULL DEFAULT '0',
  `dataint` int NOT NULL DEFAULT '0',
  `x` float NOT NULL DEFAULT '0',
  `y` float NOT NULL DEFAULT '0',
  `z` float NOT NULL DEFAULT '0',
  `o` float NOT NULL DEFAULT '0',
  `Comment` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.spell_script_names
CREATE TABLE IF NOT EXISTS `spell_script_names` (
  `spell_id` int NOT NULL,
  `ScriptName` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  UNIQUE KEY `spell_id` (`spell_id`,`ScriptName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.spell_target_position
CREATE TABLE IF NOT EXISTS `spell_target_position` (
  `ID` int unsigned NOT NULL DEFAULT '0',
  `EffectIndex` tinyint unsigned NOT NULL DEFAULT '0',
  `MapID` smallint unsigned NOT NULL DEFAULT '0',
  `PositionX` float NOT NULL DEFAULT '0',
  `PositionY` float NOT NULL DEFAULT '0',
  `PositionZ` float NOT NULL DEFAULT '0',
  `Orientation` float DEFAULT NULL,
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ID`,`EffectIndex`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Spell System';

-- Data exporting was unselected.

-- Dumping structure for table world.spell_threat
CREATE TABLE IF NOT EXISTS `spell_threat` (
  `entry` int unsigned NOT NULL,
  `flatMod` int DEFAULT NULL,
  `pctMod` float NOT NULL DEFAULT '1' COMMENT 'threat multiplier for damage/healing',
  `apPctMod` float NOT NULL DEFAULT '0' COMMENT 'additional threat bonus from attack power',
  PRIMARY KEY (`entry`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.terrain_swap_defaults
CREATE TABLE IF NOT EXISTS `terrain_swap_defaults` (
  `MapId` int unsigned NOT NULL,
  `TerrainSwapMap` int unsigned NOT NULL,
  `Comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`MapId`,`TerrainSwapMap`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.terrain_worldmap
CREATE TABLE IF NOT EXISTS `terrain_worldmap` (
  `TerrainSwapMap` int unsigned NOT NULL,
  `UiMapPhaseId` int unsigned NOT NULL,
  `Comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`TerrainSwapMap`,`UiMapPhaseId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.trainer
CREATE TABLE IF NOT EXISTS `trainer` (
  `Id` int unsigned NOT NULL DEFAULT '0',
  `Type` tinyint unsigned NOT NULL DEFAULT '2',
  `Requirement` int unsigned NOT NULL DEFAULT '0',
  `Greeting` mediumtext COLLATE utf8mb4_unicode_ci,
  `VerifiedBuild` int DEFAULT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.trainer_locale
CREATE TABLE IF NOT EXISTS `trainer_locale` (
  `Id` int unsigned NOT NULL DEFAULT '0',
  `locale` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Greeting_lang` mediumtext COLLATE utf8mb4_unicode_ci,
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`Id`,`locale`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.trainer_spell
CREATE TABLE IF NOT EXISTS `trainer_spell` (
  `TrainerId` int unsigned NOT NULL DEFAULT '0',
  `SpellId` int unsigned NOT NULL DEFAULT '0',
  `MoneyCost` int unsigned NOT NULL DEFAULT '0',
  `ReqSkillLine` int unsigned NOT NULL DEFAULT '0',
  `ReqSkillRank` int unsigned NOT NULL DEFAULT '0',
  `ReqAbility1` int unsigned NOT NULL DEFAULT '0',
  `ReqAbility2` int unsigned NOT NULL DEFAULT '0',
  `ReqAbility3` int unsigned NOT NULL DEFAULT '0',
  `ReqLevel` tinyint unsigned NOT NULL DEFAULT '0',
  `VerifiedBuild` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`TrainerId`,`SpellId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.transports
CREATE TABLE IF NOT EXISTS `transports` (
  `guid` bigint unsigned NOT NULL DEFAULT '0',
  `entry` int unsigned NOT NULL DEFAULT '0',
  `name` mediumtext COLLATE utf8mb4_unicode_ci,
  `phaseUseFlags` tinyint unsigned NOT NULL DEFAULT '0',
  `phaseid` int NOT NULL DEFAULT '0',
  `phasegroup` int NOT NULL DEFAULT '0',
  `ScriptName` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`guid`),
  UNIQUE KEY `idx_entry` (`entry`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Transports';

-- Data exporting was unselected.

-- Dumping structure for table world.trinity_string
CREATE TABLE IF NOT EXISTS `trinity_string` (
  `entry` int unsigned NOT NULL DEFAULT '0',
  `content_default` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `content_loc1` mediumtext COLLATE utf8mb4_unicode_ci,
  `content_loc2` mediumtext COLLATE utf8mb4_unicode_ci,
  `content_loc3` mediumtext COLLATE utf8mb4_unicode_ci,
  `content_loc4` mediumtext COLLATE utf8mb4_unicode_ci,
  `content_loc5` mediumtext COLLATE utf8mb4_unicode_ci,
  `content_loc6` mediumtext COLLATE utf8mb4_unicode_ci,
  `content_loc7` mediumtext COLLATE utf8mb4_unicode_ci,
  `content_loc8` mediumtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`entry`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.updates
CREATE TABLE IF NOT EXISTS `updates` (
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'filename with extension of the update.',
  `hash` char(40) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT 'sha1 hash of the sql file.',
  `state` enum('RELEASED','ARCHIVED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RELEASED' COMMENT 'defines if an update is released or archived.',
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'timestamp when the query was applied.',
  `speed` int unsigned NOT NULL DEFAULT '0' COMMENT 'time the query takes to apply in ms.',
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='List of all applied updates in this database.';

-- Data exporting was unselected.

-- Dumping structure for table world.updates_include
CREATE TABLE IF NOT EXISTS `updates_include` (
  `path` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'directory to include. $ means relative to the source directory.',
  `state` enum('RELEASED','ARCHIVED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RELEASED' COMMENT 'defines if the directory contains released or archived updates.',
  PRIMARY KEY (`path`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='List of directories where we want to include sql updates.';

-- Data exporting was unselected.

-- Dumping structure for table world.vehicle_accessory
CREATE TABLE IF NOT EXISTS `vehicle_accessory` (
  `guid` bigint unsigned NOT NULL DEFAULT '0',
  `accessory_entry` int unsigned NOT NULL DEFAULT '0',
  `seat_id` tinyint NOT NULL DEFAULT '0',
  `minion` tinyint unsigned NOT NULL DEFAULT '0',
  `description` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `summontype` tinyint unsigned NOT NULL DEFAULT '6' COMMENT 'see enum TempSummonType',
  `summontimer` int unsigned NOT NULL DEFAULT '30000' COMMENT 'timer, only relevant for certain summontypes',
  PRIMARY KEY (`guid`,`seat_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.vehicle_seat_addon
CREATE TABLE IF NOT EXISTS `vehicle_seat_addon` (
  `SeatEntry` int unsigned NOT NULL COMMENT 'VehicleSeatEntry.dbc identifier',
  `SeatOrientation` float DEFAULT '0' COMMENT 'Seat Orientation override value',
  `ExitParamX` float DEFAULT '0',
  `ExitParamY` float DEFAULT '0',
  `ExitParamZ` float DEFAULT '0',
  `ExitParamO` float DEFAULT '0',
  `ExitParamValue` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`SeatEntry`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.vehicle_template
CREATE TABLE IF NOT EXISTS `vehicle_template` (
  `creatureId` int unsigned NOT NULL,
  `despawnDelayMs` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`creatureId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.vehicle_template_accessory
CREATE TABLE IF NOT EXISTS `vehicle_template_accessory` (
  `entry` int unsigned NOT NULL DEFAULT '0',
  `accessory_entry` int unsigned NOT NULL DEFAULT '0',
  `seat_id` tinyint NOT NULL DEFAULT '0',
  `minion` tinyint unsigned NOT NULL DEFAULT '0',
  `description` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `summontype` tinyint unsigned NOT NULL DEFAULT '6' COMMENT 'see enum TempSummonType',
  `summontimer` int unsigned NOT NULL DEFAULT '30000' COMMENT 'timer, only relevant for certain summontypes',
  PRIMARY KEY (`entry`,`seat_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.version
CREATE TABLE IF NOT EXISTS `version` (
  `core_version` varchar(250) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT 'Core revision dumped at startup.',
  `core_revision` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `db_version` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Version of world DB.',
  `cache_id` int DEFAULT '0',
  PRIMARY KEY (`core_version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Version Notes';

-- Data exporting was unselected.

-- Dumping structure for view world.vw_conditions_with_labels
-- Creating temporary table to overcome VIEW dependency errors
CREATE TABLE `vw_conditions_with_labels` (
	`SourceTypeOrReferenceId` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`SourceGroup` INT UNSIGNED NOT NULL,
	`SourceEntry` INT NOT NULL,
	`SourceId` INT NOT NULL,
	`ElseGroup` INT UNSIGNED NOT NULL,
	`ConditionTypeOrReference` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`ConditionTarget` TINYINT UNSIGNED NOT NULL,
	`ConditionValue1` INT UNSIGNED NOT NULL,
	`ConditionValue2` INT UNSIGNED NOT NULL,
	`ConditionValue3` INT UNSIGNED NOT NULL,
	`NegativeCondition` TINYINT UNSIGNED NOT NULL,
	`ErrorType` INT UNSIGNED NOT NULL,
	`ErrorTextId` INT UNSIGNED NOT NULL,
	`ScriptName` CHAR(64) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`Comment` VARCHAR(1) NULL COLLATE 'utf8mb4_unicode_ci'
) ENGINE=MyISAM;

-- Dumping structure for view world.vw_disables_with_labels
-- Creating temporary table to overcome VIEW dependency errors
CREATE TABLE `vw_disables_with_labels` (
	`sourceType` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`entry` INT UNSIGNED NOT NULL,
	`flags` SMALLINT NOT NULL,
	`params_0` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`params_1` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`comment` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci'
) ENGINE=MyISAM;

-- Dumping structure for view world.vw_smart_scripts_with_labels
-- Creating temporary table to overcome VIEW dependency errors
CREATE TABLE `vw_smart_scripts_with_labels` (
	`entryorguid` BIGINT NOT NULL,
	`source_type` TINYINT UNSIGNED NOT NULL,
	`id` SMALLINT UNSIGNED NOT NULL,
	`link` SMALLINT UNSIGNED NOT NULL,
	`event_type` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`event_phase_mask` SMALLINT UNSIGNED NOT NULL,
	`event_chance` TINYINT UNSIGNED NOT NULL,
	`event_flags` SMALLINT UNSIGNED NOT NULL,
	`event_param1` INT UNSIGNED NOT NULL,
	`event_param2` INT UNSIGNED NOT NULL,
	`event_param3` INT UNSIGNED NOT NULL,
	`event_param4` INT UNSIGNED NOT NULL,
	`event_param5` INT UNSIGNED NOT NULL,
	`action_type` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`action_param1` INT UNSIGNED NOT NULL,
	`action_param2` INT UNSIGNED NOT NULL,
	`action_param3` INT UNSIGNED NOT NULL,
	`action_param4` INT UNSIGNED NOT NULL,
	`action_param5` INT UNSIGNED NOT NULL,
	`action_param6` INT UNSIGNED NOT NULL,
	`target_type` VARCHAR(1) NOT NULL COLLATE 'utf8mb3_general_ci',
	`target_param1` INT UNSIGNED NOT NULL,
	`target_param2` INT UNSIGNED NOT NULL,
	`target_param3` INT UNSIGNED NOT NULL,
	`target_param4` INT UNSIGNED NOT NULL,
	`target_x` FLOAT NOT NULL,
	`target_y` FLOAT NOT NULL,
	`target_z` FLOAT NOT NULL,
	`target_o` FLOAT NOT NULL,
	`comment` MEDIUMTEXT NOT NULL COMMENT 'Event Comment' COLLATE 'utf8mb4_unicode_ci'
) ENGINE=MyISAM;

-- Dumping structure for table world.warden_checks
CREATE TABLE IF NOT EXISTS `warden_checks` (
  `id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `type` tinyint unsigned DEFAULT NULL,
  `str` varchar(170) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` int unsigned DEFAULT NULL,
  `length` tinyint unsigned DEFAULT NULL,
  `comment` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data` binary(24) DEFAULT NULL,
  `result` varbinary(24) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=791 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.waypoints
CREATE TABLE IF NOT EXISTS `waypoints` (
  `entry` int unsigned NOT NULL DEFAULT '0',
  `pointid` int unsigned NOT NULL DEFAULT '0',
  `position_x` float NOT NULL DEFAULT '0',
  `position_y` float NOT NULL DEFAULT '0',
  `position_z` float NOT NULL DEFAULT '0',
  `orientation` float DEFAULT NULL,
  `delay` int unsigned NOT NULL DEFAULT '0',
  `point_comment` mediumtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`entry`,`pointid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Creature waypoints';

-- Data exporting was unselected.

-- Dumping structure for table world.waypoint_data
CREATE TABLE IF NOT EXISTS `waypoint_data` (
  `id` int unsigned NOT NULL DEFAULT '0' COMMENT 'Creature GUID',
  `point` int unsigned NOT NULL DEFAULT '0',
  `position_x` float NOT NULL DEFAULT '0',
  `position_y` float NOT NULL DEFAULT '0',
  `position_z` float NOT NULL DEFAULT '0',
  `orientation` float DEFAULT NULL,
  `delay` int unsigned NOT NULL DEFAULT '0',
  `move_type` int NOT NULL DEFAULT '0',
  `action` int NOT NULL DEFAULT '0',
  `action_chance` smallint NOT NULL DEFAULT '100',
  `wpguid` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`,`point`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.waypoint_scripts
CREATE TABLE IF NOT EXISTS `waypoint_scripts` (
  `id` int unsigned NOT NULL DEFAULT '0',
  `delay` int unsigned NOT NULL DEFAULT '0',
  `command` int unsigned NOT NULL DEFAULT '0',
  `datalong` int unsigned NOT NULL DEFAULT '0',
  `datalong2` int unsigned NOT NULL DEFAULT '0',
  `dataint` int unsigned NOT NULL DEFAULT '0',
  `x` float NOT NULL DEFAULT '0',
  `y` float NOT NULL DEFAULT '0',
  `z` float NOT NULL DEFAULT '0',
  `o` float NOT NULL DEFAULT '0',
  `guid` int NOT NULL DEFAULT '0',
  `Comment` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`guid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.world_safe_locs
CREATE TABLE IF NOT EXISTS `world_safe_locs` (
  `ID` int unsigned NOT NULL,
  `MapID` int unsigned DEFAULT NULL,
  `LocX` float DEFAULT NULL,
  `LocY` float DEFAULT NULL,
  `LocZ` float DEFAULT NULL,
  `Facing` float DEFAULT NULL,
  `Comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table world.world_state
CREATE TABLE IF NOT EXISTS `world_state` (
  `ID` int NOT NULL,
  `DefaultValue` int NOT NULL,
  `MapIDs` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `AreaIDs` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ScriptName` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `Comment` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Removing temporary table and create final VIEW structure
DROP TABLE IF EXISTS `vw_conditions_with_labels`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `vw_conditions_with_labels` AS select (case when (`conditions`.`SourceTypeOrReferenceId` = 0) then 'CONDITION_SOURCE_TYPE_NONE' when (`conditions`.`SourceTypeOrReferenceId` = 1) then 'CONDITION_SOURCE_TYPE_CREATURE_LOOT_TEMPLATE' when (`conditions`.`SourceTypeOrReferenceId` = 2) then 'CONDITION_SOURCE_TYPE_DISENCHANT_LOOT_TEMPLATE' when (`conditions`.`SourceTypeOrReferenceId` = 3) then 'CONDITION_SOURCE_TYPE_FISHING_LOOT_TEMPLATE' when (`conditions`.`SourceTypeOrReferenceId` = 4) then 'CONDITION_SOURCE_TYPE_GAMEOBJECT_LOOT_TEMPLATE' when (`conditions`.`SourceTypeOrReferenceId` = 5) then 'CONDITION_SOURCE_TYPE_ITEM_LOOT_TEMPLATE' when (`conditions`.`SourceTypeOrReferenceId` = 6) then 'CONDITION_SOURCE_TYPE_MAIL_LOOT_TEMPLATE' when (`conditions`.`SourceTypeOrReferenceId` = 7) then 'CONDITION_SOURCE_TYPE_MILLING_LOOT_TEMPLATE' when (`conditions`.`SourceTypeOrReferenceId` = 8) then 'CONDITION_SOURCE_TYPE_PICKPOCKETING_LOOT_TEMPLATE' when (`conditions`.`SourceTypeOrReferenceId` = 9) then 'CONDITION_SOURCE_TYPE_PROSPECTING_LOOT_TEMPLATE' when (`conditions`.`SourceTypeOrReferenceId` = 10) then 'CONDITION_SOURCE_TYPE_REFERENCE_LOOT_TEMPLATE' when (`conditions`.`SourceTypeOrReferenceId` = 11) then 'CONDITION_SOURCE_TYPE_SKINNING_LOOT_TEMPLATE' when (`conditions`.`SourceTypeOrReferenceId` = 12) then 'CONDITION_SOURCE_TYPE_SPELL_LOOT_TEMPLATE' when (`conditions`.`SourceTypeOrReferenceId` = 13) then 'CONDITION_SOURCE_TYPE_SPELL_IMPLICIT_TARGET' when (`conditions`.`SourceTypeOrReferenceId` = 14) then 'CONDITION_SOURCE_TYPE_GOSSIP_MENU' when (`conditions`.`SourceTypeOrReferenceId` = 15) then 'CONDITION_SOURCE_TYPE_GOSSIP_MENU_OPTION' when (`conditions`.`SourceTypeOrReferenceId` = 16) then 'CONDITION_SOURCE_TYPE_CREATURE_TEMPLATE_VEHICLE' when (`conditions`.`SourceTypeOrReferenceId` = 17) then 'CONDITION_SOURCE_TYPE_SPELL' when (`conditions`.`SourceTypeOrReferenceId` = 18) then 'CONDITION_SOURCE_TYPE_SPELL_CLICK_EVENT' when (`conditions`.`SourceTypeOrReferenceId` = 19) then 'CONDITION_SOURCE_TYPE_QUEST_AVAILABLE' when (`conditions`.`SourceTypeOrReferenceId` = 21) then 'CONDITION_SOURCE_TYPE_VEHICLE_SPELL' when (`conditions`.`SourceTypeOrReferenceId` = 22) then 'CONDITION_SOURCE_TYPE_SMART_EVENT' when (`conditions`.`SourceTypeOrReferenceId` = 23) then 'CONDITION_SOURCE_TYPE_NPC_VENDOR' when (`conditions`.`SourceTypeOrReferenceId` = 24) then 'CONDITION_SOURCE_TYPE_SPELL_PROC' when (`conditions`.`SourceTypeOrReferenceId` = 25) then 'CONDITION_SOURCE_TYPE_TERRAIN_SWAP' when (`conditions`.`SourceTypeOrReferenceId` = 26) then 'CONDITION_SOURCE_TYPE_PHASE' when (`conditions`.`SourceTypeOrReferenceId` = 27) then 'CONDITION_SOURCE_TYPE_GRAVEYARD' when (`conditions`.`SourceTypeOrReferenceId` = 28) then 'CONDITION_SOURCE_TYPE_AREATRIGGER' when (`conditions`.`SourceTypeOrReferenceId` = 29) then 'CONDITION_SOURCE_TYPE_CONVERSATION_LINE' when (`conditions`.`SourceTypeOrReferenceId` = 30) then 'CONDITION_SOURCE_TYPE_AREATRIGGER_CLIENT_TRIGGERED' when (`conditions`.`SourceTypeOrReferenceId` = 31) then 'CONDITION_SOURCE_TYPE_TRAINER_SPELL' when (`conditions`.`SourceTypeOrReferenceId` = 32) then 'CONDITION_SOURCE_TYPE_OBJECT_ID_VISIBILITY' else `conditions`.`SourceTypeOrReferenceId` end) AS `SourceTypeOrReferenceId`,`conditions`.`SourceGroup` AS `SourceGroup`,`conditions`.`SourceEntry` AS `SourceEntry`,`conditions`.`SourceId` AS `SourceId`,`conditions`.`ElseGroup` AS `ElseGroup`,(case when (`conditions`.`SourceTypeOrReferenceId` = 0) then 'CONDITION_NONE' when (`conditions`.`SourceTypeOrReferenceId` = 1) then 'CONDITION_AURA' when (`conditions`.`SourceTypeOrReferenceId` = 2) then 'CONDITION_ITEM' when (`conditions`.`SourceTypeOrReferenceId` = 3) then 'CONDITION_ITEM_EQUIPPED' when (`conditions`.`SourceTypeOrReferenceId` = 4) then 'CONDITION_ZONEID' when (`conditions`.`SourceTypeOrReferenceId` = 5) then 'CONDITION_REPUTATION_RANK' when (`conditions`.`SourceTypeOrReferenceId` = 6) then 'CONDITION_TEAM' when (`conditions`.`SourceTypeOrReferenceId` = 7) then 'CONDITION_SKILL' when (`conditions`.`SourceTypeOrReferenceId` = 8) then 'CONDITION_QUESTREWARDED' when (`conditions`.`SourceTypeOrReferenceId` = 9) then 'CONDITION_QUESTTAKEN' when (`conditions`.`SourceTypeOrReferenceId` = 10) then 'CONDITION_DRUNKENSTATE' when (`conditions`.`SourceTypeOrReferenceId` = 11) then 'CONDITION_WORLD_STATE' when (`conditions`.`SourceTypeOrReferenceId` = 12) then 'CONDITION_ACTIVE_EVENT' when (`conditions`.`SourceTypeOrReferenceId` = 13) then 'CONDITION_INSTANCE_INFO' when (`conditions`.`SourceTypeOrReferenceId` = 14) then 'CONDITION_QUEST_NONE' when (`conditions`.`SourceTypeOrReferenceId` = 15) then 'CONDITION_CLASS' when (`conditions`.`SourceTypeOrReferenceId` = 16) then 'CONDITION_RACE' when (`conditions`.`SourceTypeOrReferenceId` = 17) then 'CONDITION_ACHIEVEMENT' when (`conditions`.`SourceTypeOrReferenceId` = 18) then 'CONDITION_TITLE' when (`conditions`.`SourceTypeOrReferenceId` = 19) then 'CONDITION_SPAWNMASK' when (`conditions`.`SourceTypeOrReferenceId` = 20) then 'CONDITION_GENDER' when (`conditions`.`SourceTypeOrReferenceId` = 21) then 'CONDITION_UNIT_STATE' when (`conditions`.`SourceTypeOrReferenceId` = 22) then 'CONDITION_MAPID' when (`conditions`.`SourceTypeOrReferenceId` = 23) then 'CONDITION_AREAID' when (`conditions`.`SourceTypeOrReferenceId` = 24) then 'CONDITION_CREATURE_TYPE' when (`conditions`.`SourceTypeOrReferenceId` = 25) then 'CONDITION_SPELL' when (`conditions`.`SourceTypeOrReferenceId` = 26) then 'CONDITION_PHASEMASK' when (`conditions`.`SourceTypeOrReferenceId` = 27) then 'CONDITION_LEVEL' when (`conditions`.`SourceTypeOrReferenceId` = 28) then 'CONDITION_QUEST_COMPLETE' when (`conditions`.`SourceTypeOrReferenceId` = 29) then 'CONDITION_NEAR_CREATURE' when (`conditions`.`SourceTypeOrReferenceId` = 30) then 'CONDITION_NEAR_GAMEOBJECT' when (`conditions`.`SourceTypeOrReferenceId` = 31) then 'CONDITION_OBJECT_ENTRY_GUID_LEGACY' when (`conditions`.`SourceTypeOrReferenceId` = 32) then 'CONDITION_TYPE_MASK_LEGACY' when (`conditions`.`SourceTypeOrReferenceId` = 33) then 'CONDITION_RELATION_TO' when (`conditions`.`SourceTypeOrReferenceId` = 34) then 'CONDITION_REACTION_TO' when (`conditions`.`SourceTypeOrReferenceId` = 35) then 'CONDITION_DISTANCE_TO' when (`conditions`.`SourceTypeOrReferenceId` = 36) then 'CONDITION_ALIVE' when (`conditions`.`SourceTypeOrReferenceId` = 37) then 'CONDITION_HP_VAL' when (`conditions`.`SourceTypeOrReferenceId` = 38) then 'CONDITION_HP_PCT' when (`conditions`.`SourceTypeOrReferenceId` = 39) then 'CONDITION_REALM_ACHIEVEMENT' when (`conditions`.`SourceTypeOrReferenceId` = 40) then 'CONDITION_IN_WATER' when (`conditions`.`SourceTypeOrReferenceId` = 41) then 'CONDITION_TERRAIN_SWAP' when (`conditions`.`SourceTypeOrReferenceId` = 42) then 'CONDITION_STAND_STATE' when (`conditions`.`SourceTypeOrReferenceId` = 43) then 'CONDITION_DAILY_QUEST_DONE' when (`conditions`.`SourceTypeOrReferenceId` = 44) then 'CONDITION_CHARMED' when (`conditions`.`SourceTypeOrReferenceId` = 45) then 'CONDITION_PET_TYPE' when (`conditions`.`SourceTypeOrReferenceId` = 46) then 'CONDITION_TAXI' when (`conditions`.`SourceTypeOrReferenceId` = 47) then 'CONDITION_QUESTSTATE' when (`conditions`.`SourceTypeOrReferenceId` = 48) then 'CONDITION_QUEST_OBJECTIVE_PROGRESS' when (`conditions`.`SourceTypeOrReferenceId` = 49) then 'CONDITION_DIFFICULTY_ID' when (`conditions`.`SourceTypeOrReferenceId` = 50) then 'CONDITION_GAMEMASTER' when (`conditions`.`SourceTypeOrReferenceId` = 51) then 'CONDITION_OBJECT_ENTRY_GUID' when (`conditions`.`SourceTypeOrReferenceId` = 52) then 'CONDITION_TYPE_MASK' else `conditions`.`ConditionTypeOrReference` end) AS `ConditionTypeOrReference`,`conditions`.`ConditionTarget` AS `ConditionTarget`,`conditions`.`ConditionValue1` AS `ConditionValue1`,`conditions`.`ConditionValue2` AS `ConditionValue2`,`conditions`.`ConditionValue3` AS `ConditionValue3`,`conditions`.`NegativeCondition` AS `NegativeCondition`,`conditions`.`ErrorType` AS `ErrorType`,`conditions`.`ErrorTextId` AS `ErrorTextId`,`conditions`.`ScriptName` AS `ScriptName`,`conditions`.`Comment` AS `Comment` from `conditions`
;

-- Removing temporary table and create final VIEW structure
DROP TABLE IF EXISTS `vw_disables_with_labels`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `vw_disables_with_labels` AS select (case when (`disables`.`sourceType` = 0) then 'DISABLE_TYPE_SPELL' when (`disables`.`sourceType` = 1) then 'DISABLE_TYPE_QUEST' when (`disables`.`sourceType` = 2) then 'DISABLE_TYPE_MAP' when (`disables`.`sourceType` = 3) then 'DISABLE_TYPE_BATTLEGROUND' when (`disables`.`sourceType` = 4) then 'DISABLE_TYPE_ACHIEVEMENT_CRITERIA' when (`disables`.`sourceType` = 5) then 'DISABLE_TYPE_OUTDOORPVP' when (`disables`.`sourceType` = 6) then 'DISABLE_TYPE_VMAP' when (`disables`.`sourceType` = 7) then 'DISABLE_TYPE_MMAP' when (`disables`.`sourceType` = 8) then 'DISABLE_TYPE_LFG_MAP' else `disables`.`sourceType` end) AS `sourceType`,`disables`.`entry` AS `entry`,`disables`.`flags` AS `flags`,`disables`.`params_0` AS `params_0`,`disables`.`params_1` AS `params_1`,`disables`.`comment` AS `comment` from `disables`
;

-- Removing temporary table and create final VIEW structure
DROP TABLE IF EXISTS `vw_smart_scripts_with_labels`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `vw_smart_scripts_with_labels` AS select `smart_scripts`.`entryorguid` AS `entryorguid`,`smart_scripts`.`source_type` AS `source_type`,`smart_scripts`.`id` AS `id`,`smart_scripts`.`link` AS `link`,(case `smart_scripts`.`event_type` when 0 then 'SMART_EVENT_UPDATE_IC' when 1 then 'SMART_EVENT_UPDATE_OOC' when 2 then 'SMART_EVENT_HEALTH_PCT' when 3 then 'SMART_EVENT_MANA_PCT' when 4 then 'SMART_EVENT_AGGRO' when 5 then 'SMART_EVENT_KILL' when 6 then 'SMART_EVENT_DEATH' when 7 then 'SMART_EVENT_EVADE' when 8 then 'SMART_EVENT_SPELLHIT' when 9 then 'SMART_EVENT_RANGE' when 10 then 'SMART_EVENT_OOC_LOS' when 11 then 'SMART_EVENT_RESPAWN' when 12 then 'SMART_EVENT_TARGET_HEALTH_PCT' when 13 then 'SMART_EVENT_VICTIM_CASTING' when 14 then 'SMART_EVENT_FRIENDLY_HEALTH' when 15 then 'SMART_EVENT_FRIENDLY_IS_CC' when 16 then 'SMART_EVENT_FRIENDLY_MISSING_BUFF' when 17 then 'SMART_EVENT_SUMMONED_UNIT' when 18 then 'SMART_EVENT_TARGET_MANA_PCT' when 19 then 'SMART_EVENT_ACCEPTED_QUEST' when 20 then 'SMART_EVENT_REWARD_QUEST' when 21 then 'SMART_EVENT_REACHED_HOME' when 22 then 'SMART_EVENT_RECEIVE_EMOTE' when 23 then 'SMART_EVENT_HAS_AURA' when 24 then 'SMART_EVENT_TARGET_BUFFED' when 25 then 'SMART_EVENT_RESET' when 26 then 'SMART_EVENT_IC_LOS' when 27 then 'SMART_EVENT_PASSENGER_BOARDED' when 28 then 'SMART_EVENT_PASSENGER_REMOVED' when 29 then 'SMART_EVENT_CHARMED' when 30 then 'SMART_EVENT_CHARMED_TARGET' when 31 then 'SMART_EVENT_SPELLHIT_TARGET' when 32 then 'SMART_EVENT_DAMAGED' when 33 then 'SMART_EVENT_DAMAGED_TARGET' when 34 then 'SMART_EVENT_MOVEMENTINFORM' when 35 then 'SMART_EVENT_SUMMON_DESPAWNED' when 36 then 'SMART_EVENT_CORPSE_REMOVED' when 37 then 'SMART_EVENT_AI_INIT' when 38 then 'SMART_EVENT_DATA_SET' when 39 then 'SMART_EVENT_WAYPOINT_START' when 40 then 'SMART_EVENT_WAYPOINT_REACHED' when 41 then 'SMART_EVENT_TRANSPORT_ADDPLAYER' when 42 then 'SMART_EVENT_TRANSPORT_ADDCREATURE' when 43 then 'SMART_EVENT_TRANSPORT_REMOVE_PLAYER' when 44 then 'SMART_EVENT_TRANSPORT_RELOCATE' when 45 then 'SMART_EVENT_INSTANCE_PLAYER_ENTER' when 46 then 'SMART_EVENT_AREATRIGGER_ONTRIGGER' when 47 then 'SMART_EVENT_QUEST_ACCEPTED' when 48 then 'SMART_EVENT_QUEST_OBJ_COPLETETION' when 49 then 'SMART_EVENT_QUEST_COMPLETION' when 50 then 'SMART_EVENT_QUEST_REWARDED' when 51 then 'SMART_EVENT_QUEST_FAIL' when 52 then 'SMART_EVENT_TEXT_OVER' when 53 then 'SMART_EVENT_RECEIVE_HEAL' when 54 then 'SMART_EVENT_JUST_SUMMONED' when 55 then 'SMART_EVENT_WAYPOINT_PAUSED' when 56 then 'SMART_EVENT_WAYPOINT_RESUMED' when 57 then 'SMART_EVENT_WAYPOINT_STOPPED' when 58 then 'SMART_EVENT_WAYPOINT_ENDED' when 59 then 'SMART_EVENT_TIMED_EVENT_TRIGGERED' when 60 then 'SMART_EVENT_UPDATE' when 61 then 'SMART_EVENT_LINK' when 62 then 'SMART_EVENT_GOSSIP_SELECT' when 63 then 'SMART_EVENT_JUST_CREATED' when 64 then 'SMART_EVENT_GOSSIP_HELLO' when 65 then 'SMART_EVENT_FOLLOW_COMPLETED' when 66 then 'SMART_EVENT_EVENT_PHASE_CHANGE' when 67 then 'SMART_EVENT_IS_BEHIND_TARGET' when 68 then 'SMART_EVENT_GAME_EVENT_START' when 69 then 'SMART_EVENT_GAME_EVENT_END' when 70 then 'SMART_EVENT_GO_LOOT_STATE_CHANGED' when 71 then 'SMART_EVENT_GO_EVENT_INFORM' when 72 then 'SMART_EVENT_ACTION_DONE' when 73 then 'SMART_EVENT_ON_SPELLCLICK' when 74 then 'SMART_EVENT_FRIENDLY_HEALTH_PCT' when 75 then 'SMART_EVENT_DISTANCE_CREATURE' when 76 then 'SMART_EVENT_DISTANCE_GAMEOBJECT' when 77 then 'SMART_EVENT_COUNTER_SET' when 78 then 'SMART_EVENT_SCENE_START' when 79 then 'SMART_EVENT_SCENE_TRIGGER' when 80 then 'SMART_EVENT_SCENE_CANCEL' when 81 then 'SMART_EVENT_SCENE_COMPLETE' when 82 then 'SMART_EVENT_SUMMONED_UNIT_DIES' else `smart_scripts`.`event_type` end) AS `event_type`,`smart_scripts`.`event_phase_mask` AS `event_phase_mask`,`smart_scripts`.`event_chance` AS `event_chance`,`smart_scripts`.`event_flags` AS `event_flags`,`smart_scripts`.`event_param1` AS `event_param1`,`smart_scripts`.`event_param2` AS `event_param2`,`smart_scripts`.`event_param3` AS `event_param3`,`smart_scripts`.`event_param4` AS `event_param4`,`smart_scripts`.`event_param5` AS `event_param5`,(case `smart_scripts`.`action_type` when 0 then 'SMART_ACTION_NONE' when 1 then 'SMART_ACTION_TALK' when 2 then 'SMART_ACTION_SET_FACTION' when 3 then 'SMART_ACTION_MORPH_TO_ENTRY_OR_MODEL' when 4 then 'SMART_ACTION_SOUND' when 5 then 'SMART_ACTION_PLAY_EMOTE' when 6 then 'SMART_ACTION_FAIL_QUEST' when 7 then 'SMART_ACTION_OFFER_QUEST' when 8 then 'SMART_ACTION_SET_REACT_STATE' when 9 then 'SMART_ACTION_ACTIVATE_GOBJECT' when 10 then 'SMART_ACTION_RANDOM_EMOTE' when 11 then 'SMART_ACTION_CAST' when 12 then 'SMART_ACTION_SUMMON_CREATURE' when 13 then 'SMART_ACTION_THREAT_SINGLE_PCT' when 14 then 'SMART_ACTION_THREAT_ALL_PCT' when 15 then 'SMART_ACTION_CALL_AREAEXPLOREDOREVENTHAPPENS' when 16 then 'SMART_ACTION_SET_INGAME_PHASE_GROUP' when 17 then 'SMART_ACTION_SET_EMOTE_STATE' when 18 then 'SMART_ACTION_SET_UNIT_FLAG' when 19 then 'SMART_ACTION_REMOVE_UNIT_FLAG' when 20 then 'SMART_ACTION_AUTO_ATTACK' when 21 then 'SMART_ACTION_ALLOW_COMBAT_MOVEMENT' when 22 then 'SMART_ACTION_SET_EVENT_PHASE' when 23 then 'SMART_ACTION_INC_EVENT_PHASE' when 24 then 'SMART_ACTION_EVADE' when 25 then 'SMART_ACTION_FLEE_FOR_ASSIST' when 26 then 'SMART_ACTION_CALL_GROUPEVENTHAPPENS' when 27 then 'SMART_ACTION_COMBAT_STOP' when 28 then 'SMART_ACTION_REMOVEAURASFROMSPELL' when 29 then 'SMART_ACTION_FOLLOW' when 30 then 'SMART_ACTION_RANDOM_PHASE' when 31 then 'SMART_ACTION_RANDOM_PHASE_RANGE' when 32 then 'SMART_ACTION_RESET_GOBJECT' when 33 then 'SMART_ACTION_CALL_KILLEDMONSTER' when 34 then 'SMART_ACTION_SET_INST_DATA' when 35 then 'SMART_ACTION_SET_INST_DATA64' when 36 then 'SMART_ACTION_UPDATE_TEMPLATE' when 37 then 'SMART_ACTION_DIE' when 38 then 'SMART_ACTION_SET_IN_COMBAT_WITH_ZONE' when 39 then 'SMART_ACTION_CALL_FOR_HELP' when 40 then 'SMART_ACTION_SET_SHEATH' when 41 then 'SMART_ACTION_FORCE_DESPAWN' when 42 then 'SMART_ACTION_SET_INVINCIBILITY_HP_LEVEL' when 43 then 'SMART_ACTION_MOUNT_TO_ENTRY_OR_MODEL' when 44 then 'SMART_ACTION_SET_INGAME_PHASE_ID' when 45 then 'SMART_ACTION_SET_DATA' when 46 then 'SMART_ACTION_ATTACK_STOP' when 47 then 'SMART_ACTION_SET_VISIBILITY' when 48 then 'SMART_ACTION_SET_ACTIVE' when 49 then 'SMART_ACTION_ATTACK_START' when 50 then 'SMART_ACTION_SUMMON_GO' when 51 then 'SMART_ACTION_KILL_UNIT' when 52 then 'SMART_ACTION_ACTIVATE_TAXI' when 53 then 'SMART_ACTION_WP_START' when 54 then 'SMART_ACTION_WP_PAUSE' when 55 then 'SMART_ACTION_WP_STOP' when 56 then 'SMART_ACTION_ADD_ITEM' when 57 then 'SMART_ACTION_REMOVE_ITEM' when 58 then 'SMART_ACTION_INSTALL_AI_TEMPLATE' when 59 then 'SMART_ACTION_SET_RUN' when 60 then 'SMART_ACTION_SET_DISABLE_GRAVITY' when 61 then 'SMART_ACTION_SET_SWIM' when 62 then 'SMART_ACTION_TELEPORT' when 63 then 'SMART_ACTION_SET_COUNTER' when 64 then 'SMART_ACTION_STORE_TARGET_LIST' when 65 then 'SMART_ACTION_WP_RESUME' when 66 then 'SMART_ACTION_SET_ORIENTATION' when 67 then 'SMART_ACTION_CREATE_TIMED_EVENT' when 68 then 'SMART_ACTION_PLAYMOVIE' when 69 then 'SMART_ACTION_MOVE_TO_POS' when 70 then 'SMART_ACTION_ENABLE_TEMP_GOBJ' when 71 then 'SMART_ACTION_EQUIP' when 72 then 'SMART_ACTION_CLOSE_GOSSIP' when 73 then 'SMART_ACTION_TRIGGER_TIMED_EVENT' when 74 then 'SMART_ACTION_REMOVE_TIMED_EVENT' when 75 then 'SMART_ACTION_ADD_AURA' when 76 then 'SMART_ACTION_OVERRIDE_SCRIPT_BASE_OBJECT' when 77 then 'SMART_ACTION_RESET_SCRIPT_BASE_OBJECT' when 78 then 'SMART_ACTION_CALL_SCRIPT_RESET' when 79 then 'SMART_ACTION_SET_RANGED_MOVEMENT' when 80 then 'SMART_ACTION_CALL_TIMED_ACTIONLIST' when 81 then 'SMART_ACTION_SET_NPC_FLAG' when 82 then 'SMART_ACTION_ADD_NPC_FLAG' when 83 then 'SMART_ACTION_REMOVE_NPC_FLAG' when 84 then 'SMART_ACTION_SIMPLE_TALK' when 85 then 'SMART_ACTION_SELF_CAST' when 86 then 'SMART_ACTION_CROSS_CAST' when 87 then 'SMART_ACTION_CALL_RANDOM_TIMED_ACTIONLIST' when 88 then 'SMART_ACTION_CALL_RANDOM_RANGE_TIMED_ACTIONLIST' when 89 then 'SMART_ACTION_RANDOM_MOVE' when 90 then 'SMART_ACTION_SET_UNIT_FIELD_BYTES_1' when 91 then 'SMART_ACTION_REMOVE_UNIT_FIELD_BYTES_1' when 92 then 'SMART_ACTION_INTERRUPT_SPELL' when 93 then 'SMART_ACTION_SEND_GO_CUSTOM_ANIM' when 94 then 'SMART_ACTION_SET_DYNAMIC_FLAG' when 95 then 'SMART_ACTION_ADD_DYNAMIC_FLAG' when 96 then 'SMART_ACTION_REMOVE_DYNAMIC_FLAG' when 97 then 'SMART_ACTION_JUMP_TO_POS' when 98 then 'SMART_ACTION_SEND_GOSSIP_MENU' when 99 then 'SMART_ACTION_GO_SET_LOOT_STATE' when 100 then 'SMART_ACTION_SEND_TARGET_TO_TARGET' when 101 then 'SMART_ACTION_SET_HOME_POS' when 102 then 'SMART_ACTION_SET_HEALTH_REGEN' when 103 then 'SMART_ACTION_SET_ROOT' when 104 then 'SMART_ACTION_SET_GO_FLAG' when 105 then 'SMART_ACTION_ADD_GO_FLAG' when 106 then 'SMART_ACTION_REMOVE_GO_FLAG' when 107 then 'SMART_ACTION_SUMMON_CREATURE_GROUP' when 108 then 'SMART_ACTION_SET_POWER' when 109 then 'SMART_ACTION_ADD_POWER' when 110 then 'SMART_ACTION_REMOVE_POWER' when 111 then 'SMART_ACTION_GAME_EVENT_STOP' when 112 then 'SMART_ACTION_GAME_EVENT_START' when 113 then 'SMART_ACTION_START_CLOSEST_WAYPOINT' when 114 then 'SMART_ACTION_MOVE_OFFSET' when 115 then 'SMART_ACTION_RANDOM_SOUND' when 116 then 'SMART_ACTION_SET_CORPSE_DELAY' when 117 then 'SMART_ACTION_DISABLE_EVADE' when 118 then 'SMART_ACTION_GO_SET_GO_STATE' when 119 then 'SMART_ACTION_SET_CAN_FLY' when 120 then 'SMART_ACTION_REMOVE_AURAS_BY_TYPE' when 121 then 'SMART_ACTION_SET_SIGHT_DIST' when 122 then 'SMART_ACTION_FLEE' when 123 then 'SMART_ACTION_ADD_THREAT' when 124 then 'SMART_ACTION_LOAD_EQUIPMENT' when 125 then 'SMART_ACTION_TRIGGER_RANDOM_TIMED_EVENT' when 126 then 'SMART_ACTION_REMOVE_ALL_GAMEOBJECTS' when 127 then 'SMART_ACTION_PAUSE_MOVEMENT' when 128 then 'SMART_ACTION_PLAY_ANIMKIT' when 129 then 'SMART_ACTION_SCENE_PLAY' when 130 then 'SMART_ACTION_SCENE_CANCEL' when 131 then 'SMART_ACTION_SPAWN_SPAWNGROUP' when 132 then 'SMART_ACTION_DESPAWN_SPAWNGROUP' when 133 then 'SMART_ACTION_RESPAWN_BY_SPAWNID' when 134 then 'SMART_ACTION_INVOKER_CAST' when 135 then 'SMART_ACTION_PLAY_CINEMATIC' when 136 then 'SMART_ACTION_SET_MOVEMENT_SPEED' when 137 then 'SMART_ACTION_PLAY_SPELL_VISUAL_KIT' when 138 then 'SMART_ACTION_OVERRIDE_LIGHT' when 139 then 'SMART_ACTION_OVERRIDE_WEATHER' when 143 then 'SMART_ACTION_CREATE_CONVERSATION' when 144 then 'SMART_ACTION_SET_IMMUNE_PC' when 145 then 'SMART_ACTION_SET_IMMUNE_NPC' when 146 then 'SMART_ACTION_SET_UNINTERACTIBLE' when 147 then 'SMART_ACTION_ACTIVATE_GAMEOBJECT' when 148 then 'SMART_ACTION_ADD_TO_STORED_TARGET_LIST' when 149 then 'SMART_ACTION_BECOME_PERSONAL_CLONE_FOR_PLAYER' else `smart_scripts`.`action_type` end) AS `action_type`,`smart_scripts`.`action_param1` AS `action_param1`,`smart_scripts`.`action_param2` AS `action_param2`,`smart_scripts`.`action_param3` AS `action_param3`,`smart_scripts`.`action_param4` AS `action_param4`,`smart_scripts`.`action_param5` AS `action_param5`,`smart_scripts`.`action_param6` AS `action_param6`,(case `smart_scripts`.`target_type` when 0 then 'SMART_TARGET_NONE' when 1 then 'SMART_TARGET_SELF' when 2 then 'SMART_TARGET_VICTIM' when 3 then 'SMART_TARGET_HOSTILE_SECOND_AGGRO' when 4 then 'SMART_TARGET_HOSTILE_LAST_AGGRO' when 5 then 'SMART_TARGET_HOSTILE_RANDOM' when 6 then 'SMART_TARGET_HOSTILE_RANDOM_NOT_TOP' when 7 then 'SMART_TARGET_ACTION_INVOKER' when 8 then 'SMART_TARGET_POSITION' when 9 then 'SMART_TARGET_CREATURE_RANGE' when 10 then 'SMART_TARGET_CREATURE_GUID' when 11 then 'SMART_TARGET_CREATURE_DISTANCE' when 12 then 'SMART_TARGET_STORED' when 13 then 'SMART_TARGET_GAMEOBJECT_RANGE' when 14 then 'SMART_TARGET_GAMEOBJECT_GUID' when 15 then 'SMART_TARGET_GAMEOBJECT_DISTANCE' when 16 then 'SMART_TARGET_INVOKER_PARTY' when 17 then 'SMART_TARGET_PLAYER_RANGE' when 18 then 'SMART_TARGET_PLAYER_DISTANCE' when 19 then 'SMART_TARGET_CLOSEST_CREATURE' when 20 then 'SMART_TARGET_CLOSEST_GAMEOBJECT' when 21 then 'SMART_TARGET_CLOSEST_PLAYER' when 22 then 'SMART_TARGET_ACTION_INVOKER_VEHICLE' when 23 then 'SMART_TARGET_OWNER_OR_SUMMONER' when 24 then 'SMART_TARGET_THREAT_LIST' when 25 then 'SMART_TARGET_CLOSEST_ENEMY' when 26 then 'SMART_TARGET_CLOSEST_FRIENDLY' when 27 then 'SMART_TARGET_LOOT_RECIPIENTS' when 28 then 'SMART_TARGET_FARTHEST' when 29 then 'SMART_TARGET_VEHICLE_PASSENGER' when 30 then 'SMART_TARGET_CLOSEST_UNSPAWNED_GAMEOBJECT' else `smart_scripts`.`target_type` end) AS `target_type`,`smart_scripts`.`target_param1` AS `target_param1`,`smart_scripts`.`target_param2` AS `target_param2`,`smart_scripts`.`target_param3` AS `target_param3`,`smart_scripts`.`target_param4` AS `target_param4`,`smart_scripts`.`target_x` AS `target_x`,`smart_scripts`.`target_y` AS `target_y`,`smart_scripts`.`target_z` AS `target_z`,`smart_scripts`.`target_o` AS `target_o`,`smart_scripts`.`comment` AS `comment` from `smart_scripts`
;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
