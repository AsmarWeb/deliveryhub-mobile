import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
export default function RegistrationChoice(){return <ScrollView style={s.root} contentContainerStyle={s.body}>
<Text style={s.brand}>DeliveryHub · UAE</Text><Text style={s.title}>انضم إلى المنصة</Text><Text style={s.subtitle}>Choose how you'd like to join</Text>
<Pressable style={s.card} onPress={()=>router.push("/register/merchant")}><Text style={s.heading}>متجر أو شركة · Merchant</Text><Text style={s.description}>أنشئ حساب نشاطك التجاري وأرسل طلب التفعيل.</Text><Text style={s.link}>ابدأ التسجيل ←</Text></Pressable>
<Pressable style={s.card} onPress={()=>router.push("/register/driver")}><Text style={s.heading}>سائق · Driver</Text><Text style={s.description}>قدّم بياناتك ومركبتك للانضمام بعد مراجعة الإدارة.</Text><Text style={s.link}>قدّم الآن ←</Text></Pressable>
<Pressable onPress={()=>router.push("/login")}><Text style={s.signin}>لديك حساب بالفعل؟ تسجيل الدخول</Text></Pressable>
</ScrollView>}
const s=StyleSheet.create({root:{flex:1,backgroundColor:"#F5F7FB"},body:{padding:24,paddingTop:75},brand:{color:"#2563EB",fontWeight:"900"},title:{fontSize:30,color:"#0B1730",fontWeight:"900",marginTop:10},subtitle:{color:"#64748B",marginTop:8,marginBottom:26},card:{backgroundColor:"white",padding:24,borderRadius:20,borderWidth:1,borderColor:"#E2E8F0",marginBottom:17},heading:{fontSize:19,color:"#0B1730",fontWeight:"900"},description:{fontSize:14,color:"#64748B",lineHeight:23,marginTop:10},link:{color:"#2563EB",fontWeight:"800",marginTop:20},signin:{color:"#2563EB",textAlign:"center",fontWeight:"800",padding:20}});
