import * as React from 'react';
import styles from './CmsProduction.module.scss';
import { ICmsProductionProps } from './ICmsProductionProps';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
// New IOmport for Bootstrap 5 
import { HashRouter, Switch, Route } from 'react-router-dom';

import Sidebar from './Pages/Sidebar';
import Home from './Pages/Home';
import PartActionCompleted from './Pages/PartActionCompleted';
import EWODetails from './Pages/EWODetails';
import ImportEWO from './Pages/ImportEWO';
import StockUpdate from './Pages/StockUpdate';
import CMSAgeingReport from './Pages/CMSAgeingReport';
import BPRSAgeingReport from './Pages/BPRSAgeingReport';
import Help from './Pages/Help';
import UserRoles from './Pages/UserRoles';
import AssignPrimary from './Pages/AssignPrimary';
import ChangeApproverCMS from './Pages/ChangeApproverCMS';
import ChangeApproverBPRS from './Pages/ChangeApproverBPRS';
import MyActions from './Pages/MyActions';
import EWOChangeDetails from './Pages/EWOChangeDetails';
import EWOConsolidated from './Pages/EWOConsolidated';
import EWOChronology from './Pages/EWOChronology';
import PartAvailability from './Pages/PartAvailability';   
import DataManagement from './Pages/DataManagement';
import PreBPTracker from './Pages/PreBPTracker';
import PostBPTracker from './Pages/PostBPTracker';
import CMSRequestForm from './Pages/CMSRequestForm';
import BreakpointSheet from './Pages/BreakpointSheet';

const Cms: React.FC<ICmsProductionProps> = (props) => {
  const { hasTeamsContext } = props;

  return (
    <div
      className={`${styles.cmsProduction} ${hasTeamsContext ? styles.teams : ''}`}
      style={{ display: 'flex', width: '100%', height: '100vh' }}
    >
      <HashRouter>
        <Sidebar {...props} />
        <Switch>
          <Route exact path="/" render={() => <Home {...props} />} />
          <Route exact path="/PartActionCompleted" render={() => <PartActionCompleted {...props} />} />
          <Route exact path="/EWODetails" render={() => <EWODetails {...props} />} />
          <Route exact path="/ImportEWO" render={() => <ImportEWO {...props} />} />
          <Route exact path="/StockUpdate" render={() => <StockUpdate {...props} />} />
          <Route exact path="/CMSAgeingReport" render={() => <CMSAgeingReport {...props} />} />
          <Route exact path="/BPRSAgeingReport" render={() => <BPRSAgeingReport {...props} />} />
          <Route exact path="/Help" render={() => <Help {...props} />} />
          <Route exact path="/UserRoles" render={() => <UserRoles {...props} />} />
          <Route exact path="/AssignPrimary" render={() => <AssignPrimary {...props} />} />
          <Route exact path="/ChangeApproverCMS" render={() => <ChangeApproverCMS {...props} />} />
          <Route exact path="/ChangeApproverBPRS" render={() => <ChangeApproverBPRS {...props} />} />
          <Route exact path="/MyActions" render={() => <MyActions {...props} />} />
          <Route exact path="/EWOChangeDetails" render={() => <EWOChangeDetails {...props} />} />
          <Route exact path="/EWOConsolidated" render={() => <EWOConsolidated {...props} />} />
          <Route exact path="/EWOChronology" render={() => <EWOChronology {...props} />} />
          <Route exact path="/PartAvailability" render={() => <PartAvailability {...props} />} />
          <Route exact path="/DataManagement" render={() => <DataManagement {...props} />} />
          <Route exact path="/PreBPTracker" render={() => <PreBPTracker {...props} />} />
          <Route exact path="/PostBPTracker" render={() => <PostBPTracker {...props} />} />
          <Route exact path="/CMSRequestForm/:cmsId" render={() => <CMSRequestForm {...props} />} />
          <Route exact path="/BPRSRequestForm/:bprsId" render={() => <BreakpointSheet {...props} />} />
          <Route render={() => <Home {...props} />} />
        </Switch>
      </HashRouter>
    </div>
  );
};

export default Cms;