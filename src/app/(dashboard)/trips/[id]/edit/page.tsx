import { redirect } from "next/navigation";

export default function EditTripRedirectPage() {
  redirect("/operations/vehicle-stock");
}
