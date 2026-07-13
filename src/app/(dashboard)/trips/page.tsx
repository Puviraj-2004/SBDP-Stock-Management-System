import { redirect } from "next/navigation";

export default function TripsRedirectPage() {
  redirect("/operations/vehicle-stock");
}
