import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { registerDriver, registrationError } from "../../services/registration";

export default function DriverRegister() {
  const [form,setForm]=useState({name:"",email:"",password:"",password_confirmation:"",phone:"",vehicle_type:"",vehicle_plate:"",license_number:""});
  const [busy,setBusy]=useState(false);
  const fields=[
    ["name","الاسم الكامل / Full name"], ["email","البريد الإلكتروني / Email"],
    ["phone","رقم الهاتف +971 / Phone"], ["vehicle_type","نوع المركبة / Vehicle type"],
    ["vehicle_plate","رقم اللوحة / Plate number"], ["license_number","رقم رخصة القيادة / Driving license"],
    ["password","كلمة المرور / Password"], ["password_confirmation","تأكيد كلمة المرور / Confirm password"],
  ] as const;
  async function submit(){if(busy)return;if(form.password!==form.password_confirmation){Alert.alert("خطأ","كلمتا المرور غير متطابقتين");return;}setBusy(true);
    try{await registerDriver({...form,email:form.email.trim().toLowerCase()});Alert.alert("تم استلام الطلب","طلب الانضمام قيد المراجعة. لن يتم تفعيل حساب السائق حتى موافقة الإدارة.",[{text:"حسناً",onPress:()=>router.replace("/")}]);}
    catch(e){Alert.alert("تعذر التسجيل",registrationError(e));}finally{setBusy(false);}}
  return <ScrollView style={s.root} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
    <Text style={s.title}>انضم كسائق</Text><Text style={s.subtitle}>Driver application · DeliveryHub UAE</Text>
    {fields.map(([key,label])=><View key={key} style={s.field}><Text style={s.label}>{label}</Text><TextInput style={s.input} value={form[key]} onChangeText={value=>setForm(prev=>({...prev,[key]:value}))} editable={!busy} autoCapitalize={key.includes("email")?"none":"sentences"} secureTextEntry={key.includes("password")} keyboardType={key.includes("email")?"email-address":key==="phone"?"phone-pad":"default"} placeholder={label}/></View>)}
    <Pressable style={[s.button,busy&&{opacity:.6}]} onPress={submit} disabled={busy}>{busy?<ActivityIndicator color="white"/>:<Text style={s.buttonText}>إرسال طلب الانضمام · Apply</Text>}</Pressable>
  </ScrollView>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:"#F5F7FB"},body:{padding:24,paddingTop:60,paddingBottom:60},title:{fontSize:29,fontWeight:"900",color:"#0B1730"},subtitle:{color:"#64748B",marginTop:8,marginBottom:25},field:{marginBottom:15},label:{color:"#334155",fontWeight:"700",marginBottom:7},input:{borderWidth:1,borderColor:"#E2E8F0",backgroundColor:"white",borderRadius:13,padding:14,color:"#0B1730"},button:{backgroundColor:"#2563EB",padding:17,borderRadius:15,alignItems:"center",marginTop:12},buttonText:{color:"white",fontWeight:"800"}});
