import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { registerMerchant, registrationError } from "../../services/registration";

export default function MerchantRegister() {
  const [form, setForm] = useState({name:"",email:"",password:"",password_confirmation:"",business_name:"",business_phone:"",business_email:"",trade_license_number:"",tax_number:""});
  const [busy,setBusy] = useState(false);
  const fields = [
    ["name","الاسم الكامل / Full name"], ["email","البريد الإلكتروني / Email"],
    ["business_name","اسم النشاط / Business name"], ["business_phone","هاتف النشاط +971 / Business phone"],
    ["business_email","البريد التجاري (اختياري) / Business email"],
    ["trade_license_number","رقم الرخصة (اختياري) / Trade license"],
    ["tax_number","الرقم الضريبي (اختياري) / Tax number"],
    ["password","كلمة المرور / Password"], ["password_confirmation","تأكيد كلمة المرور / Confirm password"],
  ] as const;
  async function submit() {
    if(busy) return;
    if(form.password !== form.password_confirmation) { Alert.alert("خطأ", "كلمتا المرور غير متطابقتين"); return; }
    setBusy(true);
    try { await registerMerchant({...form,email:form.email.trim().toLowerCase()});
      Alert.alert("تم استلام الطلب", "طلب التاجر قيد المراجعة. سيتم إبلاغك بإجراءات التفعيل.", [{text:"حسناً",onPress:()=>router.replace("/")}]);
    } catch(e) { Alert.alert("تعذر التسجيل",registrationError(e)); } finally {setBusy(false);}
  }
  return <ScrollView style={s.root} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
    <Text style={s.title}>انضم كتاجر</Text><Text style={s.subtitle}>Merchant registration · DeliveryHub UAE</Text>
    {fields.map(([key,label])=><View key={key} style={s.field}><Text style={s.label}>{label}</Text><TextInput style={s.input} value={form[key]} onChangeText={value=>setForm(prev=>({...prev,[key]:value}))} editable={!busy} autoCapitalize={key.includes("email")?"none":"sentences"} secureTextEntry={key.includes("password")} keyboardType={key.includes("email")?"email-address":key==="business_phone"?"phone-pad":"default"} placeholder={label}/></View>)}
    <Pressable style={[s.button,busy&&{opacity:.6}]} onPress={submit} disabled={busy}>{busy?<ActivityIndicator color="white"/>:<Text style={s.buttonText}>إرسال طلب التسجيل · Submit</Text>}</Pressable>
  </ScrollView>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:"#F5F7FB"},body:{padding:24,paddingTop:60,paddingBottom:60},title:{fontSize:29,fontWeight:"900",color:"#0B1730"},subtitle:{color:"#64748B",marginTop:8,marginBottom:25},field:{marginBottom:15},label:{color:"#334155",fontWeight:"700",marginBottom:7},input:{borderWidth:1,borderColor:"#E2E8F0",backgroundColor:"white",borderRadius:13,padding:14,color:"#0B1730"},button:{backgroundColor:"#2563EB",padding:17,borderRadius:15,alignItems:"center",marginTop:12},buttonText:{color:"white",fontWeight:"800"}});
