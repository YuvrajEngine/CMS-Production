import { IEmployeeProfile } from "../INTERFACE/IEmployeeProfile";
import { ICmsProductionProps } from "../../components/ICmsProductionProps";
import SPCRUDOPS from "../DAL/spcrudops";
export interface IIITRequestsOps {    
    getEmployeeProfile(props: IEmployeeProfile): Promise<IEmployeeProfile>;
}

export default function IEmployeeProfileops() {
    const spCrudOps = SPCRUDOPS();    

    const getEmployeeProfile = async (ArtId: string | number, props: ICmsProductionProps): Promise<IEmployeeProfile[]> => {
        return await (await spCrudOps).getRootData("UserMaster"
            , 'EmployeeId,Id,FullName/Title,FullName/ID,FullName/EMail,DirectManagerName/Title,DirectManagerName/ID,DirectManagerName/EMail,OfficeCity/CompanyLocation,OfficeCity/ID,DepartmentCode/Department,DepartmentCode/ID'
            , 'FullName,DirectManagerName,OfficeCity,DepartmentCode'
            , `FullName/EMail eq '`+ArtId+`' and EmployeeStatus eq 'Active'`
            , { column: 'ID', isAscending: true }            
            ,props).then(results => {
                let brr: Array<IEmployeeProfile> = new Array<IEmployeeProfile>();
                results.map((item: {
                    EmployeeId:number,
                    DepartmentCode:any                                       
                }) => {
                    brr.push({
                    EmployeeID:item.EmployeeId,
                    EmployeeDept:item.DepartmentCode.Department
                    });
                });
                return brr;
            }
            );
    };

    return {
        getEmployeeProfile
    };
}