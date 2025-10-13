import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
    getAuth,
    signOut, 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendEmailVerification} from 'firebase/auth'
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore, doc, getDoc } from 'firebase/firestore';



export const login = createAsyncThunk('user/login', async ({ email, password }) => {
    try {
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const token = user.stsTokenManager.accessToken;
  
      // Firestore'dan kullanıcı verisini çek
      const db = getFirestore();
      const userDoc = await getDoc(doc(db, "Users", user.uid));
  
      let userData = {};
      if (userDoc.exists()) {
        userData = userDoc.data(); // Buradan role bilgisini alıyoruz
      }
  
      const enrichedUser = {
        ...user,
        displayName: userData.name || user.displayName || '',
        email: userData.email || user.email,
        photoURL: userData.photoURL || user.photoURL || null,
        role: userData.role || 'user',
      };

      const finalUserData = {
        token,
        user: enrichedUser,
      };
  
      await AsyncStorage.setItem("userToken", token);
  
      return finalUserData;
    } catch (error) {
      console.log("login error:", error);
      throw error;
    }
  });


//kullanıcı otomatik giriş işlemleri

export const autoLogin = createAsyncThunk("user/autoLogin", async() => {
    try {
        const token =await AsyncStorage.getItem("userToken")

        if (token) {
            return token
        } else {
            throw new Error("user not found")
        }
        
    } catch (error) {
        throw error
    }
})


//kullanıcı çıkış işlemleri 
export const logOut = createAsyncThunk("user/logOut", async()=>{
    try {
        const auth = getAuth()
        await signOut(auth)

        await AsyncStorage.removeItem("userToken")
        return null;

    } catch (error) {
        throw error;
    }
})


// kullanıcı kayıt işlemleri
export const register = createAsyncThunk("user/register" ,async({ email, password }) =>{
    try {
        const auth = getAuth()
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)

        const user = userCredential.user
        const token = user.stsTokenManager.accessToken

        await sendEmailVerification(user);

        await AsyncStorage.setItem("userToken", token)
        
        return token;

    } catch (error) {
        throw error
    }
})

const initialState={
    isLoading: false,
    isAuth: false,
    token: null,
    user:null,
    error:null
}

export const UserSlice = createSlice({
    name : "user",
    initialState,
    reducers:{
        setEmail: (state, action)=>{
            const lowerCaseEmail = action.payload.toLowerCase()
            state.email=lowerCaseEmail
        },
        setPassword: (state, action)=>{
            state.password=action.payload
        },
        setIsLoading: (state, action)=>{
            state.isLoading=action.payload
        }
        
    },
    extraReducers:(builder) => {
        builder
            .addCase(login.pending, (state) => {
                state.isLoading = true
                state.isAuth = false
            })
            .addCase(login.fulfilled, (state ,action) => {
                state.isLoading= false;
                state.isAuth = true;
                state.user = action.payload.user;
                state.token = action.payload.token;
            })
            .addCase(login.rejected, (state, action) => {
                state.isLoading= false;
                state.isAuth = false;
                state.error = action.error.message;
            })
            .addCase(autoLogin.pending, (state) => {
                state.isLoading = true;
                state.isAuth = false;
            })
            .addCase(autoLogin.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuth = true;
                state.token =action.payload
            })
            .addCase(autoLogin.rejected, (state,action) => {
                state.isLoading = false,
                state.isAuth = false;
                state.token = null;
            })
            .addCase(logOut.pending, (state) => {
                state.isLoading = true
            })
            .addCase(logOut.fulfilled, (state) => {
                state.isLoading= false;
                state.isAuth = false;
                state.token = null;
                state.error = null;
            })
            .addCase(logOut.rejected, (state,action) => {
                state.isLoading = false;
                state.error = action.error.message;
            })
            .addCase(register.pending, (state) => {
                state.isLoading = true;
                state.isAuth = false;
            })
            .addCase(register.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuth = true;
                state.token = action.payload;
            })
            .addCase(register.rejected, (state,action) => {
                state.isLoading = false;
                state.isAuth = false;
                state.error = "E-Postayı veya şifrenizi kontrol ediniz"
            })
    }
})

export const {setEmail, setPassword, setIsLoading } = UserSlice.actions
export default UserSlice.reducer; 