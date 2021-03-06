/*
 Navicat Premium Data Transfer

 Source Server         : Rio [EC2]
 Source Server Type    : PostgreSQL
 Source Server Version : 90209
 Source Host           : rio-server.axismaps.com
 Source Database       : rio
 Source Schema         : public

 Target Server Type    : PostgreSQL
 Target Server Version : 90209
 File Encoding         : utf-8

 Date: 11/25/2014 14:02:24 PM
*/

-- ----------------------------
--  Table structure for basepoint
-- ----------------------------
DROP TABLE IF EXISTS "public"."basepoint";
CREATE TABLE "public"."basepoint" (
	"gid" int4 NOT NULL DEFAULT nextval('basepoint_gid_seq'::regclass),
	"namecomple" varchar(50) COLLATE "default",
	"nameshort" varchar(50) COLLATE "default",
	"yearfirstd" int2,
	"yearlastdo" int2,
	"firstdispl" int2,
	"lastdispla" int2,
	"source" varchar(50) COLLATE "default",
	"folder" varchar(50) COLLATE "default",
	"geodatabas" varchar(50) COLLATE "default",
	"layer" varchar(50) COLLATE "default",
	"featuretyp" varchar(50) COLLATE "default",
	"globalid" varchar(50) NOT NULL COLLATE "default",
	"tablename" varchar(50) COLLATE "default",
	"geom" "public"."geometry",
	"uploaddate" int4,
	"notes" varchar(255) COLLATE "default",
	"nameabbrev" varchar(50) COLLATE "default"
)
WITH (OIDS=FALSE);
ALTER TABLE "public"."basepoint" OWNER TO "pg_power_user";

-- ----------------------------
--  Primary key structure for table basepoint
-- ----------------------------
ALTER TABLE "public"."basepoint" ADD PRIMARY KEY ("gid", "globalid") NOT DEFERRABLE INITIALLY IMMEDIATE;

-- ----------------------------
--  Indexes structure for table basepoint
-- ----------------------------
CREATE INDEX  "basepoint_gist" ON "public"."basepoint" USING gist(geom);
CREATE INDEX  "basepoint_layer" ON "public"."basepoint" USING btree(layer COLLATE "default" ASC NULLS LAST, firstdispl ASC NULLS LAST, lastdispla ASC NULLS LAST);

