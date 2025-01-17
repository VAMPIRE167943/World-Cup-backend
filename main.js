var express = require("express");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var cors = require("cors")
var { APITools } = require("./APImodule.js")
var cron = require("node-cron")
var { connect } = require("./mongo.js")
var teams = require("./models/teams.js");
var ratelimit = require("express-rate-limit")

var mainRouter = require("./routes/MainRouter");
var usersRouter = require("./routes/UsersRouter");
var teamsRouter = require("./routes/TeamsRouter");

var app = express();

app.use(cors())
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

var limiter = ratelimit({
   windowMS: 15 * 60 * 1000,
   max: 100,
   message: "stop lol"
})

app.use("/", mainRouter);
app.use("/users", usersRouter);
app.use("/teams", teamsRouter);
app.use(limiter)

var APIUp = false

app.get("*", function(req, res, next){
   var clientip = req.ip
   console.log(clientip)
})

app.use(function (err, req, res, next)
{
   res.locals.message = err.message;
   res.locals.error = req.app.get("env") === "development" ? err : {};
   // render the error page
   res.status(err.status || 500);
   res.send("error");
});

function matches()
{
   APITools.getAllFixtures()
      .then(async function (res)
      {
         var teamList = teams
         try
         {
            var birb = await connect()
            const matchcount = await birb.collection("matches").countDocuments({})
            if (matchcount > 0)
            {
               await birb.collection("matches").deleteMany({})
               await birb.collection("matches").insertMany(res)
               console.log("surprise motherfucker")
            } else
            {
               console.log("Why are we still here? Just to suffer? Every night, I can feel my leg... And my arm... even my fingers... The body I've lost... the comrades I've lost... won't stop hurting... It's like they're all still there. You feel it, too, don't you? I'm gonna make them give back our past!")
               await birb.collection("matches").insertMany(res)
            }
            teamList.forEach((team, index, array) =>
            {
               var totalPoints = 0
               res.forEach(match =>
               {
                  if (match.teams.home.id == team._id)
                  {
                     totalPoints += match.teams.home.pts
                  } else if (match.teams.away.id == team._id)
                  {
                     totalPoints += match.teams.away.pts
                  }
               })
               teamList[index]['pts'] = totalPoints
            })
            const teamCount = await birb.collection("teams").countDocuments({})
            if (teamCount < 1)
            {
               await birb.collection("teams").insertMany(teamList)
            } else
            {
               await birb.collection("teams").drop()
               await birb.collection("teams").insertMany(teamList)
            }
            var users = await birb.collection("people").find().toArray()
            users.forEach(async (details) =>
            {
               var newConn = await connect()
               var selectedTeams = []
               var selectedIds = []
               details.teams.forEach((team) =>
               {
                  selectedTeams.push(team)
                  selectedIds.push(team.id)
               })

               const allTeams = await newConn.collection("teams").find().toArray()
               var pts = 0
               details.teams.forEach((team, index) =>
               {
                  allTeams.forEach((dbTeam) =>
                  {
                     if (dbTeam._id == team.id)
                     {
                        selectedTeams[index]["pts"] = dbTeam.pts
                        pts += dbTeam.pts
                     }

                  })

               })
               console.log(pts)
               await newConn.collection("people").findOneAndUpdate({ email: details.email }, { $set: { pts: pts, teams: selectedTeams } })

            })
            console.log("RESPECT++")
         } catch (err)
         {
            console.log(err)
         }
      })
      .catch(function (err)
      {
         console.log(err)
      })
}
const apiMatches = matches
APITools.checkConn()
   .then(async (status) =>
   {
      APIUp = status
      if (APIUp)
      {
         apiMatches()
         var times = ["0 10 15 * * *", "0 45 17 * * *", "0 0 20 * * *", "0 15 23 * * *"];
         var schedulers = [];
         times.forEach(function (time)
         {
            schedulers.push(
               cron.schedule(time, function ()
               {
                  apiMatches()
               })
            );
         });
      } else
      {
         try
         {
            var birb = await connect()
            const teamCount = await birb.collection("teams").countDocuments({})
            if (teamCount < 1)
            {
               await birb.collection("teams").insertMany(teams)
            }

            const matchcount = await birb.collection("matches").countDocuments({})
            if (matchcount < 1)
            {
               var matches = await APITools.getAllFixtures()
               await birb.collection("matches").insertMany(matches)
            }
         } catch (error)
         {
            console.log(error)
         }

      }
   })
   .catch(async (error) =>
   {
      console.log(error)
      try
      {
         var birb = await connect()
         const teamCount = await birb.collection("teams").countDocuments({})
         if (teamCount < 1)
         {
            await birb.collection("teams").insertMany(teams)
         }

         const matchcount = await birb.collection("matches").countDocuments({})
         if (matchcount < 1)
         {
            var matches = await APITools.getAllFixtures()
            await birb.collection("matches").insertMany(matches)
         }
      } catch (error)
      {
         console.log(error)
      }

   })





app.listen(3000);

module.exports = app;
