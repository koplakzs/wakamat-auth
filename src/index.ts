import express, { NextFunction, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt, { JwtPayload } from 'jsonwebtoken';

const app = express();
const PORT = 5000;
const prisma = new PrismaClient();

app.use(express.json())

interface UserData {
  id: string;
  name: string;
  address: string;
}

interface ValidationRequest extends Request {
  userData: UserData
}

const userAccess = (req: Request, res: Response, next: NextFunction) => {
  const validationReq = req as ValidationRequest
  const {authorization} = validationReq.headers;

  console.log('here: ', authorization)

  if(!authorization){
      return res.status(401).json({
          message: 'Token diperlukan'
      })
  }

  const token = authorization.split(' ')[1];
  const secret = process.env.JWT_SECRET!;

  try {
      const jwtDecode = jwt.verify(token, secret);

      if(typeof jwtDecode !== 'string'){
          validationReq.userData = jwtDecode as UserData
      }
  } catch (error) {
      return res.status(401).json({
          message: 'Unauthorized'
      })
  }
  next()
}

// register
app.post('/register',async (req, res) => {
  const {name, email, password} = req.body;
  const hashingPassword = await bcrypt.hash(password,5);
  const result = await prisma.users.create({
    data:{
      name: name,
      email: email,
      password: hashingPassword,
    }
  })

  res.json({
    data: result,
    message: "Register user success"
  })
})

// login
app.post('/login', async(req,res)=> {
  const {email,password} = req.body;

  const user = await prisma.users.findUnique({
    where: {
      email: email,
    }
  })

  if (!user) {
    return res.status(404).json({
      message: 'User email not found'
    })
  }

  if(!user.password) {
    return res.status(404).json({
      message: 'User not set'
    })
  }

  const isPassValid = await bcrypt.compare(password,user.password)
  
  if(isPassValid){
    const payload = {
      id: user.id,
        name: user.name,
        address: user.address
    }
    const secret = process.env.JWT_SECRET!;
    const jwtExpiresIn = 60 * 60 * 1;
    const token = jwt.sign(payload,secret,{expiresIn:jwtExpiresIn})

    return res.json({
      data: {
        id: user.id,
        name: user.name,
        address: user.address
      },
      token : token
    })
  } else {
    return res.status(403).json({
      messange: 'Is it the right password?'
    })
  }
}) 

// create
app.post('/users', userAccess, async (req,res, next) => {
  const {email, name, address} = req.body;
  const result = await prisma.users.create({
    data: {
      email: email,
      name: name,
      address: address
    }
  })
  res.json({
    data: result,
    message: `User created`
  })
})

// read
app.get('/users',userAccess,async(req,res) => {
  const result = await prisma.users.findMany({
    select:{
      id: true,
      name: true,
      email:true,
      address: true
    }
  });
  res.json({
    data:result,
    message: 'Users list'
  })
})

// read by id
app.get('/users/:id',userAccess,async (req, res) => {
  const {id} = req.params;
  const result = await prisma.users.findUnique({
    select:{
      id:true,
      name:true,
      email:true,
      address:true
    },
    where:{
      id:Number(id)
    }
  })
  res.json({
    data:result,
    message: `User list by ${id }`
  })
})

// update
app.patch('/users/:id',userAccess,async (req, res) => {
  const {id} = req.params;
  const {email, name, address} = req.body;

  const result = await prisma.users.update({
    data:{
      name:name,
      email:email,
      address:address
    },
    where:{
      id:Number(id)
    },
  })
  res.json({
    data: result,
    message: `User ${name} updated`})
})

// delete
app.delete('/users/:id',userAccess, async(req,res) =>{
  const {id} = req.params
  await prisma.users.delete({
    where:{
      id: Number(id)
    }
  })
  res.json({message: `User ${id} deleted`})
})

app.listen(PORT, () => {
  console.log(`server runnng on PORT: ${PORT}`);
})