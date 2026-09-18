import currentPackage from "../../../package.json";

export const getVersion = () => {
	return currentPackage.version || "0.0.0";
};
