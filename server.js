import express from "express";
import querystring from "qs";
import axios from "axios";
import jwt from "jsonwebtoken";
const port = 4000;
const app = express()
import session from "express-session";
import 'dotenv/config';
app.use(session({
    secret: 'mySecretKey',
    resave: false,
    saveUninitialized: true,
}));
function getGoogleAuthURL() {
    const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    const options = {
      /*redirect_uri: `http://localhost:4000/auth/google`,*/
      redirect_uri: `https://oauth2-template.onrender.com/auth/google`,
      client_id: process.env.GOOGLE_CLIENT_ID,
      access_type: "offline",
      response_type: "code",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" "),
    };
    return `${rootUrl}?${querystring.stringify(options)}`;
}
app.set('view engine','ejs')
app.use(express.static('views'))
app.get("/login", (req, res) => {
    res.render("login")
});
async function getTokens({ code, clientId, clientSecret, redirectUri }) {
    const url = "https://oauth2.googleapis.com/token";
    const values = {
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
    };
    try {
        const response = await axios.post(url, querystring.stringify(values), {
            headers: {
                "Content-Type" : "application/x-www-form-urlencoded",
            },  
        });
        return response.data;
    } catch (error) {
        console.error(error);
        console.log("failed to fetch authorization tokens");
    }
}
app.get("/callback" , (req,res) => {
    res.redirect(getGoogleAuthURL())
})
app.get("/auth/google", async (req, res) => {
    const code = req.query.code;
    try {
        const { id_token, access_token } = await getTokens({
            code,
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            /*redirectUri: "http://localhost:4000/auth/google"*/
            redirectUri: "https://oauth2-template.onrender.com/auth/google"
        });
        
        const { data: userInfo } = await axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`, {
            headers: {
                Authorization: `Bearer ${id_token}`
            }
        });
        const { sub, email, name, picture } = userInfo;
        const token = jwt.sign({ sub, email, name, picture }, "mySecretKey",{expiresIn : "10m"});
        req.session.token = token;
        res.redirect("/")
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Failed to fetch authorization tokens" });
    }
});
app.get("/auth/google/url" , (req,res) => {
    return res.send(getoauthurl());
})
app.get("/",(req,res) => {
    const token = req.session.token;
    if (!token) {
        res.redirect("/login");
    }
    jwt.verify(token, 'mySecretKey' , (err,decoded) => {
        if (err) {
            res.redirect("/login");
        }
        res.render('index', { user: decoded });
    })
})
app.listen(port);