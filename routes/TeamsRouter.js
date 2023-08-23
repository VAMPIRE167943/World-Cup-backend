var express = require('express');
var router = express.Router();
var { connect } = require("../mongo.js")
var Team = require("../models/teams.js");
const APITools = require('../APImodule.js');
var cron = require("node-cron");

// Base route: /teams

// Gets all teams
router.get('/', async function (req, res, next)
{
    try
    {
        await connect()
        await Team.find()
        res.status(200).json({ message: "Gottemmmm" })
    } catch (err)
    {
        console.log(err)
        next(err)
    }
})

// Get Shortlist
router.get('/shortlist', async function (req, res, next)
{
    try
    {
        await connect()
    } catch (err)
    {
        console.log(err)
        next(err)
    }
})

// Get a specified team info
router.get('/:teamName', async function (req, res, next)
{
    try
    {
        await connect()
        var team_name = req.params.team_name
        var team = await Team.findOne({ team_name: team_name })
        if (!team)
        {
            return res.status(404).json({ error: "You sure they even exist? Cause not found..." })
        }
        res.status(200).json({ data: team, message: "Gottem!" })
    } catch (err)
    {
        console.log(err)
        next(err)
    }
})

// get matches by team
router.get('/matches/:teamID', async function (req, res, next)
{
   const specifiedTeam = Number(req.params.teamID)
   var birb = await connect()
   const result = (await birb.collection("matches").find({$or: [{ 'teams.home.id': specifiedTeam }, {'teams.away.id': specifiedTeam}] })).toArray()
   .then(function (docs) {
      res.status(200).json(docs)
   })

   // const result = (await birb.collection("matches").find()).toArray()
   // .then(function (docs) {
   //    res.status(200).json(docs)
   // })
})



module.exports = router;