import React from "react";
import { z } from "zod";

const formSchema = z.object({
  name: z.string().min(1, { message: "Please enter your companion's name" }),
});

const CompanionForm = () => {
  return <div>CompanionForm</div>;
};

export default CompanionForm;
