import { redirect } from "next/navigation";

export default function NewTripRedirectPage() {
  redirect("/operations/vehicle-stock");
}
